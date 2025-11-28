# Universal Inventory Alerts Fix - All Business Types

## Problem (BEFORE)
**All business types** showed incorrect low stock alerts because the alerts API was generating hardcoded demo data instead of using real stock levels.

**Affected Business Types**:
- 🍽️ Restaurant
- 🛒 Grocery
- 👗 Clothing
- 🔧 Hardware

**Issue**: All showed "Low Stock: 3" regardless of actual inventory.

## Solution (AFTER)
Fixed the **universal alerts API** to calculate alerts based on real-time stock data.

**File**: `src/app/api/inventory/[businessId]/alerts/route.ts`

## How It Works Now (All Business Types)

### Architecture
```
┌─────────────────────────────────────────────────┐
│         Universal Components                     │
│  (Shared by ALL business types)                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  ✓ UniversalInventoryStats                      │
│  ✓ UniversalInventoryGrid                       │
│  ✓ UniversalInventoryForm                       │
│                                                  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         Universal API Endpoint                   │
│  /api/inventory/[businessId]/alerts              │
│  (Business-agnostic, works for ALL types)       │
└─────────────────────────────────────────────────┘
```

### Alert Calculation Logic (Universal)

**For ANY business type**:

1. **Get Products**:
   ```sql
   SELECT * FROM business_products
   WHERE businessId = :businessId
     AND isActive = true
   ```

2. **Check Stock Levels** (per variant):
   ```javascript
   stockQuantity = variant.stockQuantity
   reorderLevel = variant.reorderLevel

   if (stockQuantity === 0):
     ➔ OUT OF STOCK alert

   else if (stockQuantity > 0 && stockQuantity <= reorderLevel):
     ➔ LOW STOCK alert

   else:
     ➔ HEALTHY (no alert)
   ```

3. **Generate Real Alerts**:
   - Based on actual database values
   - No hardcoded demo data
   - Works for any business type

## Business Type Verification

### Restaurant Inventory
**Page**: `src/app/restaurant/inventory/page.tsx`
**Component**: `<UniversalInventoryStats businessId={...} businessType="restaurant" />`
**API Call**: `GET /api/inventory/[businessId]/alerts`
**Status**: ✅ Uses real stock data

### Grocery Inventory
**Page**: `src/app/grocery/inventory/page.tsx`
**Component**: `<UniversalInventoryStats businessId={...} businessType="grocery" />`
**API Call**: `GET /api/inventory/[businessId]/alerts`
**Status**: ✅ Uses real stock data

### Clothing Inventory
**Page**: `src/app/clothing/inventory/page.tsx`
**Component**: `<UniversalInventoryStats businessId={...} businessType="clothing" />`
**API Call**: `GET /api/inventory/[businessId]/alerts`
**Status**: ✅ Uses real stock data

### Hardware Inventory
**Page**: `src/app/hardware/inventory/page.tsx`
**Component**: `<UniversalInventoryStats businessId={...} businessType="hardware" />`
**API Call**: `GET /api/inventory/[businessId]/alerts`
**Status**: ✅ Uses real stock data

## Example: How It Works Across Business Types

### Scenario 1: Restaurant (All Stock at 0)
```
Business: Joe's Pizza
Products: 50 ingredients
Stock Levels: All 0
Reorder Level: 5 (default)

Dashboard Shows:
- Total Items: 50
- Out of Stock: 50 ✅ (real count)
- Low Stock: 0
- Healthy Stock: 0
```

### Scenario 2: Grocery (Mixed Stock)
```
Business: Fresh Market
Products: 200 items
  - 150 items: stock = 0
  - 30 items: stock = 3 (reorder = 5)
  - 20 items: stock = 25 (reorder = 5)

Dashboard Shows:
- Total Items: 200
- Out of Stock: 150 ✅ (real count)
- Low Stock: 30 ✅ (0 < 3 ≤ 5)
- Healthy Stock: 20 ✅ (25 > 5)
```

### Scenario 3: Clothing (After Seeding)
```
Business: Fashion Store
Products: 1042 items
Stock Levels: All 0
Reorder Level: 5 (default)

Dashboard Shows:
- Total Items: 1042
- Out of Stock: 1042 ✅ (real count)
- Low Stock: 0
- Healthy Stock: 0
```

### Scenario 4: Hardware (After Restocking)
```
Business: Tools & More
Products: 100 items
  - 50 items: stock = 0
  - 25 items: stock = 2 (reorder = 5)
  - 25 items: stock = 50 (reorder = 5)

Dashboard Shows:
- Total Items: 100
- Out of Stock: 50 ✅ (real count)
- Low Stock: 25 ✅ (0 < 2 ≤ 5)
- Healthy Stock: 25 ✅ (50 > 5)
```

## Reorder Level Management (Universal)

### Default Settings
**All business types** start with:
```javascript
reorderLevel = 5  // Set during variant creation
```

### Customization Per Business Type

**Restaurant**: Common thresholds
- Perishables (meat, dairy): 2-3 days supply
- Dry goods (flour, rice): 1 week supply
- Beverages: 3-5 days supply

**Grocery**: Department-specific
- Produce: Daily delivery, low reorder (5-10)
- Frozen: Weekly delivery, higher reorder (20-50)
- Dry goods: Monthly delivery, very high (100+)

**Clothing**: Seasonal
- Fast fashion: 20-50 units per size/color
- Basics (t-shirts): 50-100 units
- Seasonal items: Varies by season

**Hardware**: Category-specific
- Fasteners (screws, nails): 100+ units
- Power tools: 2-5 units
- Specialty items: 1-2 units

## Code Changes (Universal)

### Before (Wrong - Hardcoded)
```javascript
// ❌ Generated fake alerts for first 3 products
products.forEach((product, index) => {
  if (index < 3) {
    alerts.push({
      alertType: 'low_stock',
      currentStock: 5,      // Hardcoded
      threshold: 10         // Hardcoded
    })
  }
})

// Result: Always "Low Stock: 3" for ANY business
```

### After (Correct - Real Data)
```javascript
// ✅ Generates real alerts based on actual stock
for (const product of products) {
  for (const variant of product.product_variants) {
    const stockQuantity = variant.stockQuantity  // Real DB value
    const reorderLevel = variant.reorderLevel    // Real threshold

    if (stockQuantity === 0) {
      alerts.push({
        alertType: 'out_of_stock',
        currentStock: stockQuantity,
        threshold: reorderLevel
      })
    } else if (stockQuantity <= reorderLevel) {
      alerts.push({
        alertType: 'low_stock',
        currentStock: stockQuantity,
        threshold: reorderLevel
      })
    }
  }
}

// Result: Accurate alerts for EVERY business type
```

## Testing Checklist

- [x] Restaurant inventory shows correct alerts
- [x] Grocery inventory shows correct alerts
- [x] Clothing inventory shows correct alerts
- [x] Hardware inventory shows correct alerts
- [x] All business types use same API endpoint
- [x] Alerts based on real stock levels
- [x] No hardcoded values
- [x] Reorder levels customizable per product
- [x] Out of stock properly detected
- [x] Low stock properly detected
- [x] Healthy stock properly counted

## Files Modified

### API Endpoint (Universal)
```
src/app/api/inventory/[businessId]/alerts/route.ts
  - Lines 52-126: Real-time alert generation
  - Applies to ALL business types
  - No business-type-specific logic
```

### Components (Used by All)
```
src/components/universal/inventory/universal-inventory-stats.tsx
  - Used by all business types
  - Calls universal alerts API
  - No changes needed (already universal)
```

### Business Type Pages (All Use Universal Components)
```
src/app/restaurant/inventory/page.tsx   ✓
src/app/grocery/inventory/page.tsx      ✓
src/app/clothing/inventory/page.tsx     ✓
src/app/hardware/inventory/page.tsx     ✓
```

## Summary

✅ **One Fix, All Business Types Benefit**
- Single universal API endpoint
- Shared components across all business types
- Real-time alert calculation
- No hardcoded values
- Works for current and future business types

---

**Status**: ✅ Complete - Universal Fix Applied
**Date**: 2025-11-27
**Scope**: All Business Types (Restaurant, Grocery, Clothing, Hardware)
**Impact**: Accurate inventory alerts across entire platform
