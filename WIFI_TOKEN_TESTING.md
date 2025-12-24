# WiFi Token Availability Testing Guide

## Issue Report
- **Problem**: POS shows 0 available tokens
- **Known Facts**:
  - 10 tokens exist in ESP32
  - Token "2CJ8AC9K" exists in both ESP32 and Database Ledger
  - But POS count = 0

## Testing Steps

### Step 1: Check Browser Console
1. Open Grocery POS: `http://localhost:8080/grocery/pos`
2. Open browser console (F12)
3. Look for logs starting with `🔍 [WiFi Token Availability]`
4. Check the output for:
   - ESP32 Tokens Count
   - Database Tokens Count
   - Cross-reference results
   - Final quantity map

### Step 2: Test APIs Manually

#### Test ESP32 API
```bash
# Replace BUSINESS_ID with your actual business ID
curl "http://localhost:8080/api/wifi-portal/integration/tokens/list?businessId=YOUR_BUSINESS_ID&status=unused&limit=20"
```

**Expected Response:**
```json
{
  "success": true,
  "tokens": [
    {
      "token": "2CJ8AC9K",
      "businessId": "...",
      "status": "unused",
      "duration_minutes": 1440,
      "bandwidth_down_mb": 50,
      "bandwidth_up_mb": 10
    }
  ]
}
```

#### Test Database API
```bash
# Get all UNUSED tokens
curl "http://localhost:8080/api/wifi-portal/tokens?businessId=YOUR_BUSINESS_ID&status=UNUSED&limit=100"
```

**Check Response For:**
- Does it include token "2CJ8AC9K"?
- What is the `sale` field? (should be `null` if unsold)
- What is the `tokenConfigId`?

#### Test Database API with excludeSold filter
```bash
# Get only unsold tokens
curl "http://localhost:8080/api/wifi-portal/tokens?businessId=YOUR_BUSINESS_ID&status=UNUSED&excludeSold=true&limit=100"
```

**Critical Check:**
- Does this API return "2CJ8AC9K"?
- If NO, it means the token has a sale record and is marked as SOLD
- If YES, continue to next test

### Step 3: Check Token in Database

Run this query in your database:
```sql
SELECT
  t.token,
  t.status,
  t."tokenConfigId",
  t."createdAt",
  s.id as sale_id,
  s."createdAt" as sale_date,
  s."salePrice"
FROM "WifiToken" t
LEFT JOIN "WifiTokenSale" s ON t.id = s."wifiTokenId"
WHERE t.token = '2CJ8AC9K';
```

**What to Check:**
- `status`: Should be "UNUSED"
- `sale_id`: If NOT NULL, token is SOLD and won't be available
- `tokenConfigId`: Must match one of the active menu item configs

### Step 4: Verify Token Configuration

```sql
-- Get active menu items and their configs
SELECT
  bm.id,
  bm."businessPrice",
  bm."isActive",
  tc.name,
  tc."durationMinutes",
  tc."bandwidthDownMb",
  tc."bandwidthUpMb"
FROM "BusinessTokenMenuItem" bm
JOIN "WifiTokenConfiguration" tc ON bm."tokenConfigId" = tc.id
WHERE bm."businessId" = 'YOUR_BUSINESS_ID'
  AND bm."isActive" = true;
```

**Match the tokenConfigId:**
- Token "2CJ8AC9K" must have a `tokenConfigId` that matches one of these menu items

## Common Issues & Fixes

### Issue 1: Token Has Sale Record
**Symptom:** Token not in `excludeSold=true` response
**Cause:** Token was sold previously
**Fix:** Create new unsold tokens via Bulk Create

### Issue 2: Token ConfigId Mismatch
**Symptom:** Token exists in both APIs but not counted
**Cause:** tokenConfigId doesn't match any active menu item
**Fix:** Update token's config or activate matching menu item

### Issue 3: ESP32 API Not Returning Token
**Symptom:** Token in Database but not in ESP32 response
**Cause:** Token was deleted from ESP32 or never created there
**Fix:** Re-sync or bulk create new tokens

### Issue 4: Different BusinessId
**Symptom:** Token exists but wrong business
**Cause:** Token belongs to different business
**Fix:** Use correct business ID or reassign token

## Diagnostic Output Example

### ✅ Good Output (Tokens Available)
```
🔍 [WiFi Token Availability] Starting cross-reference check...
   Business ID: abc-123
   ESP32 Tokens Count: 10
   Database Tokens Count: 10
   Cross-reference results:
     - Tokens in both ESP32 & DB: 10
     - Quantity map: { "config-uuid": 10 }
🎯 [WiFi Token Availability] Final quantity map: { "config-uuid": 10 }
```

### ❌ Bad Output (No Tokens - Sold)
```
🔍 [WiFi Token Availability] Starting cross-reference check...
   ESP32 Tokens Count: 10
   Database Tokens Count: 0  ← All tokens are sold!
   Cross-reference results:
     - Tokens in both ESP32 & DB: 0
     - Quantity map: {}
```

### ❌ Bad Output (Config Mismatch)
```
   ✓ Matched token: 2CJ8AC9K -> Config: wrong-config-id
   ⚠️  Token 2CJ8AC9K in both but config wrong-config-id not in menu
   Quantity map: {}  ← Token exists but config not in menu!
```

## Next Steps After Testing

1. Share console output from browser
2. Share API responses from curl tests
3. Share database query results
4. We'll identify exact issue and fix

## Quick Fix Commands

If all tokens are sold, create new ones:
```bash
# Go to WiFi Portal > Bulk Create tab
# Or use API:
curl -X POST http://localhost:8080/api/wifi-portal/tokens/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "YOUR_BUSINESS_ID",
    "tokenConfigId": "YOUR_CONFIG_ID",
    "quantity": 10
  }'
```
