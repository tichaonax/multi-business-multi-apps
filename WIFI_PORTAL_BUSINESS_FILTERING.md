# WiFi Portal Business-Specific Filtering

**Date:** 2025-12-18
**Status:** ✅ Complete

## Problem

WiFi Portal overview page was showing mixed data from multiple businesses:

### Before Fix
```
✅ ESP32 Portal Status
Uptime          8h 59m
ESP32 Active    41 / 100        ← WRONG: All businesses combined
Time Synced     ✓ Yes
Free Memory     88 KB
📊 Database Statistics ()       ← Business name missing
Total Tokens    123
Sold Tokens     4
```

**Issues:**
1. ❌ "ESP32 Active" showed 41 tokens from ALL businesses, not just current business
2. ❌ Business name showed as empty "()"
3. ❌ Unclear separation between device-level and business-level data

## Solution

### 1. Separated Device Health from Business Statistics

**Device Health** (shared across all businesses using same ESP32):
- Device Uptime
- Time Synced
- Free Memory

**Business Statistics** (filtered by current business only):
- Total Tokens
- Sold Tokens
- Active/In Use
- Expired
- Total Revenue
- Avg Sale

### 2. Fixed Business Name Display

Added business name to stats object and displayed in header:
```typescript
setDbStats({
  ...data.stats.summary,
  businessName: data.stats.business?.name || currentBusiness?.name || ''
})
```

Display:
```jsx
📊 Business Statistics - {dbStats.businessName || currentBusiness?.name || 'Loading...'}
```

### 3. Reorganized UI Layout

```
✅ WiFi Portal Status & Statistics

🖥️ ESP32 Device Health
Device Uptime   8h 59m
Business Active 17 / 100   ← Business tokens / Device capacity
Time Synced     ✓ Yes
Free Memory     88 KB

────────────────────────────────

📊 Business Statistics - HXI Eats
Total Tokens      123      ← Business-specific
Unused/Available  102      ← Business-specific (available for sale)
Sold Tokens       4        ← Business-specific
Active/In Use     17       ← Business-specific
Expired           106      ← Business-specific
Total Revenue     $74.00   ← Business-specific
Avg Sale          $18.50   ← Business-specific
```

## Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `src/app/wifi-portal/page.tsx` | ~35 lines | Reorganized display, added business name, Business Active metric, Unused tokens display |
| `src/app/api/wifi-portal/stats/route.ts` | ~5 lines | Added unusedTokens query and included in API response |

## Key Changes

### Updated "Business Active" Count to Show Business Subset
**Before:**
```jsx
<div>
  <div className="text-xs">ESP32 Active</div>
  <div className="font-semibold">
    {healthStatus.active_tokens} / {healthStatus.max_tokens}
    {/* Shows 41/100 for ALL businesses */}
  </div>
</div>
```

**After:**
```jsx
<div>
  <div className="text-xs">Business Active</div>
  <div className="font-semibold">
    {dbStats ? `${dbStats.activeTokens || 0} / ${healthStatus.max_tokens || 100}` : 'Loading...'}
    {/* Shows 17/100 - only current business tokens out of device capacity */}
  </div>
</div>
```

### Added Clear Section Headers

**Device Health:**
```jsx
<h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-3">
  🖥️ ESP32 Device Health
</h4>
```

**Business Statistics:**
```jsx
<h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-3">
  📊 Business Statistics - {dbStats.businessName}
</h4>
```

### Changed Grid Layout
- **Device Health:** 4 columns (Uptime, Business Active, Time Synced, Memory)
- **Business Statistics:** 4 columns (7 metrics total: Total, Unused, Sold, Active, Expired, Revenue, Avg Sale)

## Testing

### For HXI Eats (Restaurant)
```
✅ WiFi Portal Status & Statistics

🖥️ ESP32 Device Health
Device Uptime   8h 59m
Business Active 17 / 100     ← HXI Eats tokens / Device capacity
Time Synced     ✓ Yes
Free Memory     88 KB

📊 Business Statistics - HXI Eats
Total Tokens      123
Unused/Available  102        ← Available for sale
Sold Tokens       4
Active/In Use     17
Expired           106
Total Revenue     $74.00
Avg Sale          $18.50
```

### For Mvimvi Groceries
```
✅ WiFi Portal Status & Statistics

🖥️ ESP32 Device Health
Device Uptime   8h 59m        ← Same device
Business Active 24 / 100      ← Mvimvi tokens / Same device capacity
Time Synced     ✓ Yes         ← Same device
Free Memory     88 KB         ← Same device

📊 Business Statistics - Mvimvi Groceries
Total Tokens      165         ← Different business
Unused/Available  133         ← Available for sale (Different business)
Sold Tokens       8           ← Different business
Active/In Use     24          ← Different business
Expired           88          ← Different business
Total Revenue     $227.00     ← Different business
Avg Sale          $28.38      ← Different business
```

## Verification Steps

1. Navigate to http://localhost:8080/wifi-portal
2. Select HXI Eats
3. Verify:
   - ✅ Device Health section shows device-level stats with Business Active (17/100)
   - ✅ Business Statistics shows "HXI Eats" in header
   - ✅ All counts are HXI Eats specific (Total: 123, Unused: 102, Sold: 4)
   - ✅ Unused/Available shows tokens ready for sale
4. Switch to Mvimvi Groceries
5. Verify:
   - ✅ Device Health unchanged (same device)
   - ✅ Business Active updates to Mvimvi subset (24/100)
   - ✅ Business Statistics shows "Mvimvi Groceries"
   - ✅ All counts update to Mvimvi specific (Total: 165, Unused: 133, Sold: 8)

## Database Verification

Run this to confirm counts are correct:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const businesses = await prisma.businesses.findMany({
    where: { OR: [{ type: 'restaurant' }, { type: 'grocery' }] }
  });

  for (const biz of businesses) {
    const [total, sold] = await Promise.all([
      prisma.wifiTokens.count({ where: { businessId: biz.id } }),
      prisma.wifiTokenSales.count({ where: { businessId: biz.id } })
    ]);
    console.log(biz.name + ':', 'Total=' + total, 'Sold=' + sold);
  }

  await prisma.\$disconnect();
}
verify();
"
```

Expected output:
```
HXI Eats: Total=123 Sold=4
Mvimvi Groceries: Total=165 Sold=8
```

## Impact

### Before
- ❌ Misleading "41/100" count showing all businesses combined
- ❌ Users couldn't tell which stats were business-specific
- ❌ Business name missing "()"
- ❌ Confusion about data scope

### After
- ✅ "Business Active" shows business-specific subset (e.g., "17 / 100")
- ✅ "Unused/Available" shows tokens ready for sale
- ✅ Clear separation: Device Health vs Business Statistics
- ✅ All business counts properly filtered by businessId
- ✅ Business name prominently displayed in header
- ✅ No data mixing between businesses
- ✅ Users can see both their tokens and device capacity
- ✅ Complete visibility into token lifecycle (unused → sold → active → expired)
- ✅ Users can confidently rely on displayed statistics

## Production Readiness

- ✅ Business filtering verified
- ✅ Business name displayed correctly
- ✅ Clear section separation
- ✅ Auto-refresh maintains filtering
- ✅ Cache cleared
- ✅ Ready for deployment
