# WiFi Token Quantity Tracking - Critical Bug Fix

**Date:** 2025-12-17
**Status:** ✅ Complete
**Priority:** Critical - Production Bug

---

## Problem Summary

WiFi token quantities were showing as **0 available** in both Restaurant and Grocery POS, even though tokens existed in the database and the WiFi Token Menu page correctly showed 19 available tokens.

**Root Cause:** POS pages were querying tokens with `status=ACTIVE` but available tokens have `status=UNUSED`.

---

## Solution Implemented

### 1. Fixed Token Status Query

**Files Modified:**
- `src/app/grocery/pos/page.tsx:184`
- `src/app/restaurant/pos/page.tsx:174`
- `src/app/api/universal/orders/route.ts:568`

**Change:**
```typescript
// BEFORE (incorrect)
status=ACTIVE&excludeSold=true

// AFTER (correct)
status=UNUSED&excludeSold=true
```

**Explanation:**
WiFi tokens have these statuses:
- `UNUSED` - Token exists but hasn't been redeemed (available for sale)
- `ACTIVE` - Token is currently being used
- `EXPIRED` - Token has expired
- `DISABLED` - Token is disabled
- `SOLD` - Token has been sold

The POS needs to count `UNUSED` tokens, not `ACTIVE` ones.

### 2. Added Token Quantity Validation in Grocery POS

**File:** `src/app/grocery/pos/page.tsx:292-326`

**Added validation to prevent adding tokens with 0 quantity:**

```typescript
if ((product as any).wifiToken) {
  const availableQuantity = (product as any).availableQuantity || 0
  const currentCartQuantity = cart.find(c => c.id === product.id)?.quantity || 0

  if (availableQuantity <= currentCartQuantity) {
    if (availableQuantity === 0) {
      void customAlert({
        title: '⚠️ No WiFi Tokens Available',
        description: `No WiFi tokens available for "${product.name}".
                     Please create more tokens in the WiFi Portal.`
      })
    } else {
      void customAlert({
        title: '⚠️ Insufficient Tokens',
        description: `Only ${availableQuantity} WiFi token(s) available...`
      })
    }
    return
  }
}
```

### 3. Enhanced Token API Response

**File:** `src/app/api/wifi-portal/tokens/route.ts:458`

**Added `tokenConfigId` to API response:**

```typescript
tokens: tokens.map((t) => ({
  id: t.id,
  token: t.token,
  tokenConfigId: t.tokenConfigId, // NEW: For easier counting
  status: t.status,
  // ... rest of fields
}))
```

### 4. Added "Available for Sale" Summary to Database Ledger

**File:** `src/app/wifi-portal/tokens/page.tsx:1161-1203`

**Added visual summary showing available tokens by configuration:**

```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <h3 className="font-semibold text-blue-900 mb-3">📦 Available for Sale</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {/* Counts UNUSED tokens without sales records by configuration */}
    {/* Shows with color coding: Red (0), Orange (<10), Green (≥10) */}
  </div>
</div>
```

**Features:**
- Groups UNUSED tokens by configuration name
- Excludes sold tokens (where `sale !== null`)
- Color-coded: Red (0), Orange (<10), Green (≥10)
- Shows count prominently with large bold numbers

---

## How Token Availability Works

### Token Lifecycle

1. **Created** → `status=UNUSED`, `sale=null` → **Available for Sale**
2. **Sold from POS** → `status=UNUSED`, `sale={saleRecord}` → **NOT Available**
3. **Redeemed by Customer** → `status=ACTIVE`, `sale={saleRecord}` → **In Use**
4. **Expired** → `status=EXPIRED` → **No Longer Valid**

### Availability Calculation

```typescript
// Token is available for sale if:
token.status === 'UNUSED' && token.sale === null
```

### Where Quantities Are Displayed

1. **WiFi Token Menu** (`/grocery/wifi-tokens`) - Already working correctly
2. **Restaurant POS** - ✅ Fixed - Shows "📦 X available" badge
3. **Grocery POS** - ✅ Fixed - Shows "📦 X available" badge
4. **Database Ledger** - ✅ Added - Shows summary cards by configuration

---

## Files Modified

### Frontend - POS Pages
1. `src/app/grocery/pos/page.tsx`
   - Line 184: Changed query from `ACTIVE` to `UNUSED`
   - Line 191: Fixed counting logic to use `tokenConfigId`
   - Lines 292-326: Added quantity validation for cart

2. `src/app/restaurant/pos/page.tsx`
   - Line 174: Changed query from `ACTIVE` to `UNUSED`
   - Line 181: Fixed counting logic to use `tokenConfigId`

### Frontend - Dashboard
3. `src/app/wifi-portal/tokens/page.tsx`
   - Line 49: Added `sale` field to WifiToken interface
   - Lines 1161-1203: Added "Available for Sale" summary section

### Backend - APIs
4. `src/app/api/wifi-portal/tokens/route.ts`
   - Line 458: Added `tokenConfigId` to response

5. `src/app/api/universal/orders/route.ts`
   - Line 568: Changed query from `ACTIVE` to `UNUSED` for finding available tokens

---

## Testing Results

### Before Fix
- ❌ Restaurant POS: Shows "📦 0 available"
- ❌ Grocery POS: Shows "📦 0 available"
- ❌ Grocery POS: Allows adding 0-quantity items to cart
- ❌ Database Ledger: No availability summary

### After Fix
- ✅ Restaurant POS: Shows "📦 19 available" (actual count)
- ✅ Grocery POS: Shows "📦 19 available" (actual count)
- ✅ Grocery POS: Blocks adding 0-quantity items with clear error
- ✅ Database Ledger: Shows summary cards with counts by configuration

---

## Impact

### User Experience Improvements
1. **Accurate Inventory** - POS now shows real token availability
2. **Prevents Errors** - Can't add unavailable tokens to cart
3. **Visual Feedback** - Color-coded badges (Red/Orange/Green)
4. **Quick Overview** - Database Ledger shows availability at a glance

### Business Logic
- Ensures tokens are only sold when actually available
- Prevents overselling of WiFi tokens
- Maintains accurate accounting via `WifiTokenSales` records

---

## Technical Details

### Token Status Enum
```prisma
enum WifiTokenStatus {
  ACTIVE   // Token is being used
  UNUSED   // Token exists but not yet redeemed
  EXPIRED  // Token has expired
  DISABLED // Token is disabled
  SOLD     // Token has been sold (deprecated - use sale relation instead)
}
```

### Sale Tracking
- **POS Sales**: Creates `WifiTokenSales` record with `saleChannel='POS'`
- **Direct Sales**: Creates `WifiTokenSales` record with `saleChannel='DIRECT'`
- **Check if Sold**: `token.sale !== null && token.sale !== undefined`

### API Filtering
```
GET /api/wifi-portal/tokens?businessId=xxx&status=UNUSED&excludeSold=true
```

Parameters:
- `status=UNUSED` - Only tokens not yet redeemed
- `excludeSold=true` - Exclude tokens with sales records
- Result: Only tokens available for sale

---

## Summary

✅ **Critical Bug Fixed**: Token quantities now display correctly across all pages

**Root Cause**: Using wrong status filter (`ACTIVE` instead of `UNUSED`)
**Solution**: Query `UNUSED` tokens and exclude those with sales records
**Impact**: High - Affects core POS functionality for WiFi token sales

**Files Modified**: 5 files
**Lines Changed**: ~120 lines
**Breaking Changes**: None
**Backward Compatibility**: Full

All WiFi token availability tracking now works correctly! 🎉
