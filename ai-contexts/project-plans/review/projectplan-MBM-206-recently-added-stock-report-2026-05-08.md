---
id: MBM-206
title: Recently Added Stock / Inventory Report + Dashboard Activity Feed
status: IMPLEMENTED
created: 2026-05-08
---

# MBM-206 — Recently Added Stock Report + Dashboard Activity Integration

## Objective

Give store managers and owners a **stock additions report** that answers:
- "What inventory was added in the last N days?"
- "How many units came in, from which suppliers, at what cost?"
- "Who is adding stock and when?"

Plus surface **recent stock additions in the dashboard activity feed** so they are visible immediately after login without navigating to a report.

---

## Key Discovery

### Primary data source — `BusinessStockMovements`
Every time stock is added (bulk-add route, clothing add-stock route, stock-take submission), a `BusinessStockMovements` record is written with `movementType = 'PURCHASE_RECEIVED'`.  
This model already has a `barcodeInventoryItemId` column (added in MBM-193 migration) so we can join directly to `BarcodeInventoryItems`.

Relevant fields available per movement:
| Field | Source |
|-------|--------|
| `id` | `BusinessStockMovements.id` |
| `createdAt` | `BusinessStockMovements.createdAt` (the stock-in timestamp) |
| `quantity` | `BusinessStockMovements.quantity` |
| `unitCost` | `BusinessStockMovements.unitCost` |
| `reference` | `BusinessStockMovements.reference` |
| `employeeId` | `BusinessStockMovements.employeeId` → `Employees.name` |
| Item name / SKU / category | joined via `barcodeInventoryItemId` → `BarcodeInventoryItems` |
| Supplier | `BarcodeInventoryItems.supplierId` → `BusinessSuppliers.name` |
| Category | `BarcodeInventoryItems.categoryId` → `BusinessCategories.name` |

### No schema change required
`BusinessStockMovements.barcodeInventoryItemId` already exists (MBM-193).  
`BusinessStockMovements.employeeId` already exists. All joins are in place.

### Dashboard recent-activity
`/api/dashboard/recent-activity/route.ts` currently queries loans, expenses, orders, deliveries etc.  
It uses a `sevenDaysAgo` window and returns ≤20 activities.  
A new section querying `BusinessStockMovements` (PURCHASE_RECEIVED, last 7 days) needs to be appended.

---

## Scope

### Phase 1 — API endpoint
Create `GET /api/universal/reports/stock-additions/route.ts`.  
Accepts `businessId`, date filters, optional category/supplier/employee filters.  
Returns summary stats + paginated movements list.

### Phase 2 — Report page UI
Create `src/app/grocery/reports/stock-additions/page.tsx`.  
- Date range pills: Today | Yesterday | 7 Days | 30 Days | All Time  
- Summary cards: total movements, total units in, total cost value, unique suppliers  
- Table: item name, SKU, category, supplier, qty added, unit cost, total cost, added-by employee, date/time  
- Filter dropdowns: category, supplier  
- Business switcher already works via `businessId` query param

### Phase 3 — Dashboard activity feed
Update `/api/dashboard/recent-activity/route.ts` to include a `stock_addition` activity type.  
Each activity card shows: "X units of [Item Name] added" with link to the report.

### Phase 4 — Navigation entries
Add a "Stock Additions" report card to `src/app/grocery/reports/page.tsx`.

---

## API Design

### `GET /api/universal/reports/stock-additions`

**Query parameters:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `businessId` | string | required | |
| `startDate` | ISO date string | 7 days ago | e.g. `2026-05-01` |
| `endDate` | ISO date string | today | e.g. `2026-05-08` |
| `categoryId` | string | — | filter by item category |
| `supplierId` | string | — | filter by item supplier |
| `employeeId` | string | — | filter by who added the stock |
| `page` | number | 1 | |
| `limit` | number | 50 | max 100 |

**Response shape:**
```json
{
  "success": true,
  "dateRange": {
    "startDate": "2026-05-01T00:00:00Z",
    "endDate": "2026-05-08T23:59:59Z",
    "days": 7
  },
  "summary": {
    "totalMovements": 45,
    "totalItemsAffected": 23,
    "totalUnitsAdded": 1240,
    "totalCostValue": 4850.00,
    "uniqueSuppliers": 8
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 45,
    "totalPages": 1
  },
  "data": [
    {
      "movementId": "abc123",
      "itemId": "item456",
      "itemName": "Maize Meal 2kg",
      "sku": "GRO-INV-00012",
      "category": "Grains",
      "supplier": "Grain Suppliers Ltd",
      "qtyAdded": 50,
      "unitCost": 2.50,
      "totalCost": 125.00,
      "addedBy": "Ticha H.",
      "addedAt": "2026-05-07T09:30:00Z",
      "reference": "PO-2026-001"
    }
  ]
}
```

**Prisma query strategy:**
```ts
const movements = await prisma.businessStockMovements.findMany({
  where: {
    businessId,
    movementType: 'PURCHASE_RECEIVED',
    createdAt: { gte: startDate, lte: endDate },
    barcodeInventoryItemId: { not: null },
    ...(categoryId ? { barcode_inventory_items: { categoryId } } : {}),
    ...(supplierId ? { barcode_inventory_items: { supplierId } } : {}),
    ...(employeeId ? { employeeId } : {})
  },
  include: {
    barcode_inventory_items: {
      include: {
        business_category: { select: { name: true } },
        business_supplier: { select: { name: true } }
      }
    },
    employees: { select: { name: true } }
  },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit
});
```

---

## Dashboard Activity Integration

### Activity type: `stock_addition`

New section in `/api/dashboard/recent-activity/route.ts`:

```ts
const stockAdditions = await prisma.businessStockMovements.findMany({
  where: {
    movementType: 'PURCHASE_RECEIVED',
    createdAt: { gte: sevenDaysAgo },
    barcodeInventoryItemId: { not: null },
    businesses: { is: { isActive: true } }
  },
  include: {
    barcode_inventory_items: { select: { name: true } },
    businesses: { select: { id: true, name: true, businessType: true } }
  },
  orderBy: { createdAt: 'desc' },
  take: 5  // keep low: combined feed has 20 item cap
});
```

**Activity card shape:**
```json
{
  "id": "stock-<movementId>",
  "type": "stock_addition",
  "title": "Stock Added",
  "description": "50 units of Maize Meal 2kg received",
  "createdAt": "2026-05-07T09:30:00Z",
  "module": "inventory",
  "icon": "📦",
  "status": "completed",
  "entityId": "<movementId>",
  "link": "/grocery/reports/stock-additions?businessId=<id>&startDate=<today>",
  "businessInfo": { "id": "...", "name": "...", "type": "..." }
}
```

---

## New Files

| File | Purpose |
|------|---------|
| `src/app/api/universal/reports/stock-additions/route.ts` | Report data API endpoint |
| `src/app/grocery/reports/stock-additions/page.tsx` | Report UI — date pills, summary cards, table |

---

## Updated Files

| File | Change |
|------|--------|
| `src/app/grocery/reports/page.tsx` | Add "Stock Additions" report card |
| `src/app/api/dashboard/recent-activity/route.ts` | Add `stock_addition` activity section |
| `src/app/dashboard/page.tsx` | Handle `stock_addition` activity link/click |

---

## UI Design

### Report page layout

```
[Stock Additions Report]

[ Today ] [ Yesterday ] [ 7 Days ] [ 30 Days ] [ All Time ]  |  [Category ▾] [Supplier ▾]

┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  45 Movements    │  1,240 Units In  │  $4,850 Value    │  8 Suppliers     │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘

┌─────────────────┬───────┬──────────┬────────────┬──────┬──────┬──────────┬────────────┬──────────────────┐
│ Item            │ SKU   │ Category │ Supplier   │ Qty  │ Cost │ Total    │ Added By   │ Date             │
├─────────────────┼───────┼──────────┼────────────┼──────┼──────┼──────────┼────────────┼──────────────────┤
│ Maize Meal 2kg  │ GRO.. │ Grains   │ Grain Sup. │  50  │ 2.50 │ 125.00   │ Ticha H.   │ May 7, 9:30 AM  │
└─────────────────┴───────┴──────────┴────────────┴──────┴──────┴──────────┴────────────┴──────────────────┘
```

### Dashboard activity card
```
📦  Stock Added  ·  Grocery Store
    50 units of Maize Meal 2kg received        > View Report
    May 7, 9:30 AM
```

---

## Testing Checklist

- [ ] API returns correct data for each date pill (Today, Yesterday, 7d, 30d, All Time)
- [ ] Summary totals match summed row data
- [ ] Category filter narrows results correctly
- [ ] Supplier filter narrows results correctly
- [ ] Results scoped to businessId — no cross-business data leak
- [ ] Movements with null `barcodeInventoryItemId` are excluded (clothing variants or legacy)
- [ ] Dashboard activity feed shows stock_addition entries within 7-day window
- [ ] Dashboard activity link navigates to correct report page with correct businessId and date pre-set to today
- [ ] Report card appears in the grocery reports page
- [ ] Pagination works when results exceed limit
- [ ] Zero-result state renders gracefully (empty state message)
- [ ] User without access to business sees 403

---

## Review

### Changes Made

| File | Change |
|------|--------|
| `src/app/api/universal/reports/stock-additions/route.ts` | **New** — `GET` endpoint; queries `BusinessStockMovements` (`PURCHASE_RECEIVED`) + joins `BarcodeInventoryItems`; returns summary stats + paginated rows |
| `src/app/grocery/reports/stock-additions/page.tsx` | **New** — Report UI with `DateRangeSelector` pills, 5 summary cards, sortable table, CSV export, pagination |
| `src/app/grocery/reports/page.tsx` | Added "🗃️ Stock Additions" report card (teal) |
| `src/app/api/dashboard/recent-activity/route.ts` | Added section 10 — queries up to 5 recent `PURCHASE_RECEIVED` movements; creates `stock_addition` activity entries |
| `src/app/dashboard/page.tsx` | Added `stock_addition` case to `handleActivityClick` switch — navigates to `/[businessType]/reports/stock-additions` |

### Recommendations for Follow-up

- **Clothing business:** Add the same report card to `src/app/clothing/reports/page.tsx` — already works via the universal API with `businessType` from business context.
- **Filter UI:** Add category/supplier dropdown filters to the report page (API already accepts `categoryId` and `supplierId` params).
- **"Added By" filter:** A user filter dropdown would help managers audit who is doing the restocking.
- **Legacy items note:** Items that predate movement logging won't appear — consider a small info tooltip in the UI.


1. **Clothing business?** — `BusinessStockMovements` stores `businessType`. Should the report page also be accessible at `src/app/clothing/reports/stock-additions/page.tsx`, or should we use one page at `src/app/grocery/reports/stock-additions/page.tsx` with a universal API accessible from both? *(Recommended: single page + universal API, accessed via `businessId` param — same pattern as stock-velocity report)*

2. **Items added via stock-take (`StockTakeDraft` submit)?** — These also write `PURCHASE_RECEIVED` movements. Should they appear in this report (they will by default) or be filtered out? *(Recommended: include them — they represent physical stock received)*

3. **Legacy items** — Items created before movement logging was added won't have `PURCHASE_RECEIVED` movements. The report will only show items added after that point. This is expected behaviour and should be noted in the UI with a small info tooltip.

4. **Report from non-grocery businesses?** — Do we want the same report available from the Housing/Consulting/Chicken/etc. businesses that use `BarcodeInventoryItems`? *(Recommended: phase 1 grocery only, extend later)*
