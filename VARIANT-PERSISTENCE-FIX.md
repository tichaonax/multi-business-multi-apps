# Variant Persistence Fix

## Problem
Variant prices were not saving - they showed $0.00 after saving and reloading the page.

## Root Causes Found

### 1. **Wrong Prisma Model Name**
**Issue:** API was using `product_variants` (relation name) instead of `productVariants` (model name) for update operations.

**Impact:** Variant update operations were silently failing.

**Fix:** Changed all variant operations to use correct model name:
- `tx.product_variants.update` → `tx.productVariants.update`
- `tx.product_variants.updateMany` → `tx.productVariants.updateMany`
- `tx.product_variants.create` → `tx.productVariants.create`
- `tx.product_variants.findMany` → `tx.productVariants.findMany`

**Files Changed:**
- `src/app/api/universal/products/route.ts` (lines 260, 272, 375, 384, 395, 401, 409, 416)

---

### 2. **SKU Not Preserved on Updates**
**Issue:** Form was generating new SKUs on every save instead of preserving existing ones.

**Impact:** Variants were treated as new instead of updates.

**Fix:** Modified form to preserve existing SKU:
```typescript
sku: v.sku || v.id || `VAR-${Date.now()}-...`
```

**Files Changed:**
- `src/components/restaurant/menu-item-form.tsx` (lines 111, 160, 365)

---

### 3. **Variant ID Not Preserved**
**Issue:** Form wasn't explicitly passing variant `id` field in submission.

**Impact:** API couldn't identify which variants to update vs create.

**Fix:** Explicitly include `id` field in variant submission:
```typescript
{
  id: v.id, // Preserve ID for updates
  name: v.name,
  price: v.price,
  // ...
}
```

**Files Changed:**
- `src/components/restaurant/menu-item-form.tsx` (line 360)

---

## Debug Logging Added

Added comprehensive logging to trace the save flow:

### Form Logging
```
[Form Submit] Submitting variants: ["Large: $3.50", "Regular: $2.50", ...]
```

### API Logging
```
[Variants Update] Product xxx: Received 4 variants
  - Large: $3.50 (id: xxx-variant-EGGS-LAR)
  - Regular: $2.50 (id: xxx-variant-EGGS-REG)
  ...
[Variants Update] Updating variant xxx: Large = $3.50
[Variants Update] Successfully updated 4 variants
```

---

## How to Test

### 1. **Start Dev Server**
```bash
npm run dev
```

### 2. **Edit a Menu Item with Variants**
1. Go to Restaurant → Menu Management
2. Click on any item with variants (e.g., "Eggs")
3. Update variant prices:
   - Default: $2.00
   - Large: $3.50
   - Regular: $2.50
   - Small: $1.75

### 3. **Save and Check Logs**

Open browser console (F12) and check for:
```
[Form Submit] Submitting variants: ["Default: $2", "Large: $3.5", ...]
```

Check terminal/server logs for:
```
[Variants Update] Product xxx: Received 4 variants
  - Default: $2 (id: xxx)
  - Large: $3.5 (id: xxx)
[Variants Update] Updating variant xxx: Default = $2
[Variants Update] Successfully updated 4 variants
```

### 4. **Reload Page**
Refresh the page and verify:
- ✅ Variant prices should be saved (not $0.00)
- ✅ All 4 variants visible
- ✅ Prices match what you entered

### 5. **Verify in Database**
```bash
node scripts/check-menu-data.js
```

Should show:
```
Product: Eggs
  Variants (4):
    - Default: $2
    - Large: $3.5
    - Regular: $2.5
    - Small: $1.75
```

---

## What If It Still Doesn't Work?

### Check 1: Variant IDs Present
Open browser console after editing an item:
```javascript
// Should show variant IDs
console.log($0.__reactProps$[...].variants)
```

Each variant should have an `id` field like:
```
{
  id: "03ce2ad2-...-variant-EGGS-LAR",
  name: "Large",
  price: 3.5,
  sku: "EGGS-LAR"
}
```

### Check 2: API Receiving Data
Check server logs when you click Save. Should see:
```
[Variants Update] Product xxx: Received 4 variants
```

If you see this but variants still don't save, check the Prisma error logs.

### Check 3: Database Permissions
Run this to test direct database update:
```bash
node scripts/test-variant-save.js
```

Should show database can update variants successfully.

---

## Files Modified

### API Layer
- `src/app/api/universal/products/route.ts`
  - Fixed Prisma model name (product_variants → productVariants)
  - Added debug logging
  - Fixed variant update transaction logic

### Form Layer
- `src/components/restaurant/menu-item-form.tsx`
  - Added `sku` field to variant state
  - Preserve existing SKU on load
  - Preserve variant ID in submission
  - Added console logging

### Scripts
- `scripts/test-variant-save.js` - Test database update directly
- `scripts/check-menu-data.js` - Verify menu data integrity

---

## Expected Behavior After Fix

✅ **On Load:** Variants load with correct prices from database
✅ **On Edit:** Can change variant prices in form
✅ **On Save:** Prices save to database correctly
✅ **On Reload:** Saved prices persist and display correctly
✅ **In Logs:** Can trace entire save flow from form → API → database

---

## Summary

The main issue was using the wrong Prisma model name (`product_variants` instead of `productVariants`), causing silent failures on updates. Combined with not preserving variant IDs and SKUs, variants were being treated as new creations instead of updates.

All issues are now fixed with comprehensive logging to help debug any future issues.
