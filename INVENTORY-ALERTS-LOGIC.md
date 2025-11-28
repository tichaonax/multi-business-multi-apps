# Inventory Alerts Logic - How Low Stock is Calculated

## Overview
Inventory alerts are generated in **real-time** based on actual stock levels compared to reorder thresholds, not hardcoded values.

## Alert Types & Calculation

### 1. Out of Stock Alert
**Condition**: `stockQuantity === 0`

**Properties**:
- Alert Type: `out_of_stock`
- Priority: `critical` (red)
- Message: "Product is out of stock"
- Action: "Reorder immediately"

**Example**:
```
Product: Beach Shirt
Stock Quantity: 0
Reorder Level: 5
Result: OUT OF STOCK alert
```

### 2. Low Stock Alert
**Condition**: `stockQuantity > 0 AND stockQuantity <= reorderLevel`

**Properties**:
- Alert Type: `low_stock`
- Priority: `high` (orange)
- Message: "Product stock is running low (X remaining)"
- Action: "Consider reordering soon"

**Example**:
```
Product: Beach Shirt
Stock Quantity: 3
Reorder Level: 5
Result: LOW STOCK alert (3 items remaining)
```

### 3. Healthy Stock
**Condition**: `stockQuantity > reorderLevel`

**Properties**:
- No alert generated
- Shown in "Healthy Stock" count

**Example**:
```
Product: Beach Shirt
Stock Quantity: 20
Reorder Level: 5
Result: No alert (healthy)
```

## Reorder Level

The **reorder level** is set per product variant and determines the threshold for alerts:

### Default Values
- New products: `reorderLevel = 5`
- Can be customized per product in inventory management

### Where It's Stored
```sql
product_variants table:
- stockQuantity: Current stock on hand
- reorderLevel: Threshold for low stock alerts
```

## Current Situation (All Products at 0)

With your current inventory where all products have `stockQuantity = 0`:

```
Total Products: 1042
Stock Quantity: 0 (all products)
Reorder Level: 5 (default)

Results:
- Out of Stock: 1042 products
- Low Stock: 0 products
- Healthy Stock: 0 products
```

## After Restocking Example

Let's say you restock 3 products:

**Product A**: Add 20 units
- Stock: 20, Reorder: 5
- Status: ✅ **Healthy** (20 > 5)

**Product B**: Add 3 units
- Stock: 3, Reorder: 5
- Status: ⚠️ **Low Stock** (0 < 3 ≤ 5)

**Product C**: No restock
- Stock: 0, Reorder: 5
- Status: 🔴 **Out of Stock** (0 = 0)

**Dashboard Would Show**:
```
Total Items: 1042
Low Stock: 1 (Product B)
Out of Stock: 1041 (Product C + others)
Healthy Stock: 1 (Product A)
```

## How to Adjust Reorder Levels

### Per Product
1. Go to Inventory → Items
2. Click on a product
3. Edit variant
4. Set "Reorder Level" to desired threshold
5. Save

### Recommended Thresholds

**Fast-Moving Items** (high sales):
- Reorder Level: 20-50 units
- Ensures you never run out

**Slow-Moving Items** (low sales):
- Reorder Level: 2-5 units
- Minimizes holding costs

**Seasonal Items**:
- High season: 50-100 units
- Low season: 5-10 units

## Stock Health Categories

### Overview Stats
```typescript
stockHealth: {
  healthyStock: items.filter(item => item.currentStock > reorderLevel).length
  lowStock: alerts.filter(alert => alert.alertType === 'low_stock').length
  outOfStock: alerts.filter(alert => alert.alertType === 'out_of_stock').length
  overstock: items.filter(item => item.currentStock > 100).length
}
```

### Visual Indicators
- 🟢 **Green (Healthy)**: Stock > Reorder Level
- 🟠 **Orange (Low)**: 0 < Stock ≤ Reorder Level
- 🔴 **Red (Out)**: Stock = 0
- 🟣 **Purple (Over)**: Stock > 100 (simplified threshold)

## API Endpoint

**GET** `/api/inventory/[businessId]/alerts`

**Parameters**:
- `alertType`: Filter by `low_stock`, `out_of_stock`, etc.
- `priority`: Filter by `critical`, `high`, `medium`, `low`
- `acknowledged`: Filter acknowledged alerts
- `page`, `limit`: Pagination

**Response**:
```json
{
  "alerts": [
    {
      "id": "alert-variant-123",
      "alertType": "out_of_stock",
      "priority": "critical",
      "itemName": "Beach Shirt",
      "currentStock": 0,
      "threshold": 5,
      "message": "Beach Shirt is out of stock",
      "actionRequired": "Reorder immediately"
    }
  ],
  "summary": {
    "total": 1042,
    "byType": {
      "lowStock": 0,
      "outOfStock": 1042
    }
  }
}
```

## Before Fix (Wrong)

**Problem**: Hardcoded demo alerts
```javascript
// Old code - WRONG
products.forEach((product, index) => {
  if (index < 3) {
    alerts.push({
      alertType: 'low_stock',
      currentStock: 5,  // ❌ Hardcoded
      threshold: 10     // ❌ Hardcoded
    })
  }
})
```

**Result**: Always showed "Low Stock: 3" regardless of actual inventory

## After Fix (Correct)

**Solution**: Real-time calculation
```javascript
// New code - CORRECT
for (const variant of product.product_variants) {
  const stockQuantity = variant.stockQuantity  // ✅ Real data
  const reorderLevel = variant.reorderLevel    // ✅ Real threshold

  if (stockQuantity === 0) {
    // Generate out of stock alert
  } else if (stockQuantity <= reorderLevel) {
    // Generate low stock alert
  }
}
```

**Result**: Accurate alerts based on actual stock levels

---

**File**: `src/app/api/inventory/[businessId]/alerts/route.ts`
**Lines**: 52-126
**Status**: ✅ Fixed - Now uses real-time stock data
**Date**: 2025-11-27
