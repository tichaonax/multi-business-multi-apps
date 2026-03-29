# MBM-169 — Grocery POS Enhancements

**Date:** 2026-03-29
**Status:** AWAITING APPROVAL
**Priority:** High

---

## Overview

Five improvements to the Grocery POS:

1. **Hide digital scale by default** — show only when needed via toggle button
2. **Desk Mode** — clickable category tabs + product badges with performance data (mirroring restaurant POS)
3. **Cart +/- quantity buttons** — inline quantity controls in the POS cart panel
4. **Per-badge performance comparison** — exact same pattern as restaurant POS, permission-aware, extended to show previous 2 days per card
5. **Bug fix: mini cart → POS cart sync** — quantity changes made in the mini cart are not reflected in the main POS cart

---

## Current State

| Feature | Current Behaviour |
|---------|-------------------|
| Digital scale | Always visible — no way to hide it |
| Desk mode | Does not exist — only `live` / `manual` posMode |
| Cart quantity controls | Only a delete (🗑️) button — no +/- buttons |
| Per-badge performance | Not implemented in grocery POS |
| Mini cart sync bug | `globalCart` → local `cart` sync only handles the "clear all" case; quantity updates from mini cart are lost |

---

## Reference: Restaurant POS Card Behaviour (What We Are Matching)

From screenshots and code review, the restaurant POS shows **two different card layouts** depending on the user's permission:

### Manager / Financial Data User (`canAccessFinancialData = true`)

```
┌────────────────────────────────────────────────┐
│  Sadza & 1Pc Chicken                           │
│                                                │
│  $1.00          8 sold      $9.00 ← revenue   │
│  ▓▓▓▓▓▓▓▓▓▓▓░░  (green bar - Good)            │
│  yesterday: 25 · 2d ago: —                    │
└────────────────────────────────────────────────┘
```

- **Price** (left)
- **Sold-today count** badge (e.g. "8 sold") in yellow/green pill
- **Revenue** = `price × soldToday` (right, large, coloured to match bar) — **financial users only**
- **Progress bar** showing today vs yesterday ratio (green/amber/red)
- **"yesterday: N"** text below bar

### Salesperson (`canAccessFinancialData = false`)

```
┌────────────────────────────────────────────────┐
│  Sadza & 1Pc Chicken                           │
│                                                │
│  $1.00    8 sold                               │
│  ▓▓▓▓▓▓▓▓▓▓▓░░  (green bar - Good)            │
│  yesterday: 25 · 2d ago: —                    │
└────────────────────────────────────────────────┘
```

- Same as above **but NO revenue amount** shown
- Price, sold count, bar, yesterday text — all visible

### Bar Colour Logic (from restaurant POS source)

| Condition | Bar colour | Label | Bar fill |
|-----------|-----------|-------|----------|
| `soldToday > 0`, `soldYesterday > 0`, ratio ≥ 1.0 | 🟢 Green | Good | 100% |
| `soldToday > 0`, `soldYesterday > 0`, ratio ≥ 0.5 | 🟡 Amber | Fair | ratio × 100% |
| `soldToday > 0`, `soldYesterday > 0`, ratio < 0.5 | 🔴 Red | Low | ratio × 100% |
| `soldToday > 0`, `soldYesterday == 0` | 🟢 Green | New | 60% |
| `soldToday == 0` | No bar shown | — | — |

### "Previous 2 days" Extension

The restaurant API currently returns only `soldToday` and `soldYesterday`. The grocery version will also return `soldDayBefore` (day before yesterday), so each card can show:

```
yesterday: 25 · 2d ago: 18
```

This gives staff better context (one unusual day doesn't look like a trend).

---

## Feature 1 — Hide Digital Scale by Default

### Problem
The scale section is always rendered in the left panel, taking up space even for stores that rarely weigh items.

### Solution
- Add `scaleVisible: boolean` state defaulting to `false`
- Restore preference from `localStorage` key `grocery-pos-scale-{businessId}` on mount
- Add **"⚖️ Scale"** toggle button in the POS toolbar (near the scan bar)
- When active: button shows a highlighted/filled style; scale section is visible
- When inactive: button is outlined; scale section is hidden

### UI Placement
```
[Scan bar ......................] [⚖️ Scale] [📦 Bulk Stock] [Manual Entry]
```

### Files to Change

| File | Change |
|------|--------|
| `src/app/grocery/pos/page.tsx` | `scaleVisible` state + localStorage persistence + toggle button + conditional render |

**No DB migration needed.**

---

## Feature 2 — Desk Mode

### Problem
No mode for counter staff who want to click product cards quickly without scanning. The restaurant POS has this; grocery does not.

### Solution
Add a **"🖥️ Desk"** toggle in the POS toolbar. When active:
- **Category tabs** across the top — horizontal scrollable row (All + one tab per category)
- **Larger product cards** — taller, more readable, with performance bar (see Feature 4)
- **Cart quantity badge** overlay on bottom-right of each card (how many are in the current order)
- **Scan bar** remains available at the top for quick barcode additions

Desk mode is orthogonal to `posMode` — it can be active in both `live` and `manual` modes.

### State & Persistence

```typescript
const [deskMode, setDeskMode] = useState<boolean>(false)
// Restore from localStorage `grocery-pos-deskmode-{businessId}` on mount
// Persist to localStorage on every change
```

### Category Tabs

- Fetch categories on mount from existing `/api/universal/categories?businessId=&businessType=grocery`
- Render: `[All] [🥦 Fresh Produce] [🥛 Dairy & Eggs] [🥩 Meat & Poultry] ...`
- `selectedCategory` state filters the product grid (null = All)
- Predefined taxonomy categories from MBM-166 are available in these dropdowns

### Product Card in Desk Mode

```
┌──────────────────────────────────┐
│  Pure Life Water 500ml            │   ← name (larger text)
│                                   │
│  $1.50     14 sold    $21.00      │   ← price | sold badge | revenue (financial only)
│  ▓▓▓▓▓▓░░░  (green - Good)       │   ← performance bar
│  yesterday: 18 · 2d ago: 12      │   ← 2-day context
│                              [3] │   ← cart qty badge (bottom-right)
└──────────────────────────────────┘
```

Normal mode cards remain compact (unchanged).

### Files to Change

| File | Change |
|------|--------|
| `src/app/grocery/pos/page.tsx` | `deskMode` state + localStorage + toggle button + category tabs + large card layout |

**No DB migration needed.**

---

## Feature 3 — Cart +/- Quantity Buttons

### Problem
The POS cart only has a delete (🗑️) button per item. To change quantity you must re-scan or re-click the product. Mini cart has +/- but the main POS cart does not.

### Solution
Add inline quantity controls to each cart row:

```
Pure Life Water 500ml    [−] [2] [+]    $3.00   [🗑️]
```

Add `updateCartQuantity(itemId: string, newQty: number)` helper:
```typescript
const updateCartQuantity = (itemId: string, newQty: number) => {
  if (newQty <= 0) { removeFromCart(itemId); return }
  setCart(prev => prev.map(item =>
    item.id === itemId
      ? { ...item, quantity: newQty, subtotal: item.price * newQty }
      : item
  ))
}
```

- `−` → `updateCartQuantity(id, qty - 1)` (removes item when reaching 0)
- `+` → `updateCartQuantity(id, qty + 1)`
- Delete button (🗑️) still present for quick removal

### Files to Change

| File | Change |
|------|--------|
| `src/app/grocery/pos/page.tsx` | `updateCartQuantity()` function + cart row JSX update |

**No DB migration needed.**

---

## Feature 4 — Per-Badge Performance Comparison (Matching Restaurant POS)

### What the Restaurant POS Does (Reference)

The restaurant POS:
1. Calls `GET /api/restaurant/product-stats?businessId=&timezone=` on mount
2. Builds `soldTodayCounts` and `soldYesterdayCounts` maps keyed by productId
3. Attaches `soldToday` and `soldYesterday` to each menu item
4. Re-sorts items: sold-today items first (by firstSoldTodayAt ASC), then unsold items
5. Renders per-card: sold badge + revenue (financial only) + bar + "yesterday: N"

### What We Are Building for Grocery

Exact same pattern but:
- New endpoint: `GET /api/grocery/product-stats?businessId=` (grocery-specific, not reusing restaurant endpoint which is restaurant-order-only)
- Adds `soldDayBefore` (day before yesterday) so card shows `yesterday: N · 2d ago: N`
- Uses `canSeeFinancials` permission check (same as restaurant): `isAdmin || hasPermission('canAccessFinancialData')`
- Only shown in **Desk Mode** (performance data not fetched in normal scan mode — keeps it fast)

### New API: `GET /api/grocery/product-stats`

**Location:** `src/app/api/grocery/product-stats/route.ts`

**Logic:**
```
today     = start of current calendar day (UTC)
yesterday = today - 1 day
dayBefore = today - 2 days

Query businessOrderItems JOIN businessOrders
WHERE businessOrders.businessId = ? AND businessOrders.status != 'cancelled'
  AND businessOrders.createdAt >= dayBefore

For each item:
  bucket = 'today' | 'yesterday' | 'dayBefore'
  group by productId/barcode, sum quantity per bucket
```

**Response shape:**
```json
{
  "success": true,
  "data": [
    {
      "productId": "...",
      "barcode": "...",
      "soldToday": 14,
      "soldYesterday": 18,
      "soldDayBefore": 12,
      "firstSoldTodayAt": "2026-03-29T07:15:00Z"
    }
  ]
}
```

Sorted by `soldToday` descending (same as restaurant).

### Permission-Aware Card Layout

In desk mode, for each product card:

```typescript
const canSeeFinancials = isAdmin || hasPermission('canAccessFinancialData')
const stats = productStatsMap.get(item.barcode ?? item.id)
const soldToday = stats?.soldToday ?? 0
const soldYesterday = stats?.soldYesterday ?? 0
const soldDayBefore = stats?.soldDayBefore ?? 0
const showBar = soldToday > 0

// Bar colour logic (mirrors restaurant POS exactly):
let barColorClass = 'bg-red-500'
let barTextColorClass = 'text-red-500 dark:text-red-400'
let barFill = 0
let barLabel = 'Low'

if (showBar) {
  if (soldYesterday > 0) {
    const ratio = soldToday / soldYesterday
    if (ratio >= 1.0) {
      barColorClass = 'bg-green-500'; barTextColorClass = 'text-green-600 dark:text-green-400'
      barFill = 100; barLabel = 'Good'
    } else if (ratio >= 0.5) {
      barColorClass = 'bg-amber-400'; barTextColorClass = 'text-amber-600 dark:text-amber-400'
      barFill = ratio * 100; barLabel = 'Fair'
    } else {
      barColorClass = 'bg-red-500'; barTextColorClass = 'text-red-500 dark:text-red-400'
      barFill = ratio * 100; barLabel = 'Low'
    }
  } else {
    // No yesterday baseline — first sales
    barColorClass = 'bg-green-500'; barTextColorClass = 'text-green-600 dark:text-green-400'
    barFill = 60; barLabel = 'New'
  }
}
```

**Card JSX (desk mode only):**

```
Row 1: product name
Row 2 (when showBar):
  Left:  price + "N sold" badge
  Right: "$X.XX revenue" (canSeeFinancials only, in barTextColorClass colour)
Row 3 (when showBar):
  Full-width progress bar (barFill%, barColorClass)
Row 4 (when showBar && soldYesterday > 0):
  "yesterday: {soldYesterday} · 2d ago: {soldDayBefore || '—'}" in small grey text
Row 5: cart quantity badge (bottom-right overlay when item is in cart)
```

### Fetch Lifecycle

- Fetch on desk mode **activation** (when `deskMode` switches to `true`)
- Re-fetch after each **completed sale** (hook into `handleCompleteSale` success callback, same as restaurant)
- No auto-polling — on-demand only

### Sort Order (Desk Mode)

When stats are loaded, re-sort displayed products:
1. Items with `soldToday > 0` first — ordered by `firstSoldTodayAt` ASC (most recently first-sold at top)
2. Items with `soldToday === 0` — remain in their default order

(Exact same sort logic as restaurant POS.)

### Files to Change

| File | Change |
|------|--------|
| `src/app/api/grocery/product-stats/route.ts` | **New file** |
| `src/app/grocery/pos/page.tsx` | `productStats` state, fetch + statsMap build, desk mode card JSX, sort logic |

**No DB migration needed** — reads from existing `businessOrderItems`.

---

## Feature 5 — Bug Fix: Mini Cart → POS Cart Sync

### Root Cause

The grocery POS has two sync directions:

| Direction | Implementation | Status |
|-----------|---------------|--------|
| POS local cart → global cart | `useEffect` watching `cart`, calls `replaceGlobalCart()` | ✅ Works |
| Global cart → POS local cart | `useEffect` watching `globalCart` | ⚠️ Partial — only handles the "clear all" case |

**The bug:** When mini cart changes an item's quantity (e.g. 2 → 3), the global cart context updates correctly, but the POS local `cart` state still holds the old quantity. When the cashier submits from the POS, the stale quantity is used.

### Fix

Extend the reverse-sync `useEffect` (currently lines ~343-349 in grocery POS) to also sync quantity changes:

```typescript
useEffect(() => {
  if (!currentBusinessId || !cartLoaded || syncingFromPOS.current) return

  // Case 1: mini cart cleared externally → clear POS cart
  if (globalCart.length === 0 && cart.length > 0) {
    setCart([])
    return
  }

  // Case 2: mini cart quantity changed → sync to POS cart
  // Only when both carts have the same set of item IDs
  // (avoids overwriting a mid-scan local cart with a stale global state)
  if (globalCart.length > 0 && cart.length > 0) {
    const globalIds = new Set(globalCart.map(g => g.variantId))
    const localIds = new Set(cart.map(c => c.id))
    const sameItems =
      [...globalIds].every(id => localIds.has(id)) &&
      [...localIds].every(id => globalIds.has(id))

    if (sameItems) {
      const qtyMap = new Map(globalCart.map(g => [g.variantId, g.quantity]))
      const needsUpdate = cart.some(c => qtyMap.get(c.id) !== c.quantity)

      if (needsUpdate) {
        setCart(prev =>
          prev
            .map(item => {
              const newQty = qtyMap.get(item.id)
              if (!newQty || newQty <= 0) return null
              return { ...item, quantity: newQty, subtotal: item.price * newQty }
            })
            .filter(Boolean) as CartItem[]
        )
      }
    }
  }
}, [globalCart, currentBusinessId, cartLoaded])
```

**Safety:** `syncingFromPOS.current` is set to `true` while the POS pushes its state to global cart, which prevents this effect from firing and creating an infinite loop.

### Files to Change

| File | Change |
|------|--------|
| `src/app/grocery/pos/page.tsx` | Extend reverse-sync `useEffect` |

**No DB migration needed.**

---

## Database Changes

**None required.** All five features work with existing schema. The product stats API reads from the existing `businessOrderItems` table.

---

## New Files

| File | Purpose |
|------|---------|
| `src/app/api/grocery/product-stats/route.ts` | Per-product sold counts: today, yesterday, day-before-yesterday |

---

## Modified Files

| File | Changes |
|------|---------|
| `src/app/grocery/pos/page.tsx` | All 5 features |

---

## Impact Analysis

| Area | Risk | Notes |
|------|------|-------|
| Digital scale toggle | Low | Additive — hides/shows an existing section |
| Desk mode | Medium | New UI mode; checkout/payment logic untouched |
| Cart +/- buttons | Low | Additive — new helper + JSX update to cart rows |
| Product stats API | Low | New read-only endpoint; no writes |
| Mini cart sync fix | Low-Medium | Extends existing `useEffect`; guarded by `syncingFromPOS.current` |

---

## Implementation Todo List

### Feature 1 — Digital Scale Toggle ✅
- [x] Add `scaleVisible` state (default `false`, restored from `grocery-pos-scale-{businessId}` localStorage)
- [x] Persist `scaleVisible` changes to localStorage
- [x] Add "⚖️ Digital Scale" toggle button in POS toolbar with active/inactive styling
- [x] Wrap scale section in `{scaleVisible && ...}` conditional

### Feature 2 — Desk Mode ✅
- [x] Add `deskMode` state (default `false`, restored from `grocery-pos-deskmode-{businessId}` localStorage)
- [x] Persist `deskMode` changes to localStorage
- [x] Add "🖥️ Desk Mode" toggle button in POS toolbar
- [x] Add `selectedCategory` state (null = All)
- [x] Render horizontal scrollable category tab bar (visible in desk mode only, derived from product.category field)
- [x] Render large product card layout when `deskMode === true` (larger padding, border-2, blue highlight when in cart)
- [x] Add cart quantity badge overlay (top-right corner) on desk mode cards
- [x] Show all products in desk mode (no .slice(0, 4) limit); filter by selectedCategory
- [x] Keep scan bar available in desk mode

### Feature 3 — Cart +/- Quantity Buttons ✅
- [x] Reuse existing `updateQuantity(productId, newQty)` function (already existed)
- [x] Update cart row JSX: add `−` · qty · `+` inline controls next to each item
- [x] `−` at qty 1 removes the item (calls `removeFromCart`)

### Feature 4 — Per-Badge Performance Comparison ✅
- [x] Create `src/app/api/grocery/product-stats/route.ts`
  - [x] Authenticate user + validate `businessId`
  - [x] Query `businessOrderItems` for today, yesterday, day-before-yesterday in parallel
  - [x] Aggregate `soldToday`, `soldYesterday`, `soldDayBefore` per product (keyed by productVariantId or `inv_{inventoryItemId}`)
  - [x] Return sorted by `soldToday` descending
- [x] Add `productStatsMap` state (Map keyed by product.id matching front-end IDs)
- [x] Fetch product stats when `deskMode` activates (not on every render)
- [x] Re-fetch after each completed sale in desk mode
- [x] Add `canSeeFinancials` check inline in card: `isAdmin || hasPermission('canAccessFinancialData')`
- [x] Implement bar colour logic (Good/Fair/Low/New — mirrors restaurant POS exactly)
- [x] Render in desk mode card:
  - [x] Sold-today count badge (yellow pill)
  - [x] Revenue (`price × soldToday`, `barTextColorClass`) — financial users only
  - [x] Progress bar (width = barFill%, colour = barColorClass)
  - [x] "yesterday: N · 2d ago: N" text below bar
- [x] Sort desk mode products: soldToday > 0 first (by firstSoldTodayAt ASC), then unsold

### Feature 5 — Mini Cart Sync Bug Fix ✅
- [x] Extend reverse-sync `useEffect` in grocery POS:
  - [x] Keep existing "clear all" case
  - [x] Add quantity sync: map globalCart quantities onto local cart items
  - [x] Remove items deleted from mini cart
- [x] Guarded by `syncingFromPOS.current` to prevent infinite loop

---

## Review

All 5 features implemented. No DB migrations required.

**Phase 1 — Digital Scale Toggle:** `scaleVisible` state with localStorage, toggle button, conditional render.

**Phase 2 — Desk Mode:** `deskMode` state with localStorage, "🖥️ Desk Mode" toolbar button, category tab bar (derived from product.category field — no extra API call), large card grid, cart qty badge overlay, all products shown (no .slice(0,4) limit), category filter.

**Phase 3 — Cart +/- Buttons:** Reused existing `updateQuantity()`. Added inline `−` / qty / `+` controls to each cart row. Weight-based items skip controls.

**Phase 4 — Per-badge Performance:** New `GET /api/grocery/product-stats` endpoint (keyed by `productVariantId` or `inv_{inventoryItemId}`). Stats fetched on deskMode activation and after each sale. Bar colour logic: Good/Fair/Low/New. Revenue shown to financial users only. Sort: soldToday > 0 items first by firstSoldTodayAt ASC.

**Phase 5 — Mini Cart Sync Fix:** Reverse-sync now propagates quantity changes and removals from mini cart back to POS cart.

**Follow-up suggestion:** Phase 4 stats only cover products sold through the universal orders API (`businessOrderItems`). Inventory items scanned via barcode (e.g. `inv_` items) are included via `attributes.inventoryItemId`. If a product ever appears with neither a `productVariantId` nor an `inventoryItemId` in attributes, it will not appear in stats.

---

## Phase 6 — Desk Mode: Proper Data Source (BarcodeInventoryItems) ✅

**Date:** 2026-03-29
**Status:** COMPLETE

### Problem

The desk mode grid was loading `BusinessProducts` from `/api/universal/products`. This is the wrong data source for grocery — the 31 departments and their stock items are stored in `BarcodeInventoryItems` joined with `BusinessCategories` (which have emoji icons). The `BusinessProducts` table also contained "Default" variant names for transferred bales.

### Solution

1. **New API: `GET /api/grocery/desk-products`** — loads `BarcodeInventoryItems` (isActive=true, stockQuantity>0) with `BusinessCategories` (name + emoji). Returns top 10 categories by total stockQuantity, items mapped to `inv_{inventoryItemId}` POSItem format.

2. **Desk mode category tabs** — now uses `deskCategories` from the new API (with emoji icons), rather than deriving from `products.category` strings.

3. **Desk mode product grid** — uses `deskProducts` (BarcodeInventoryItems) instead of `products` (BusinessProducts). Filter by `categoryId` (UUID), not category name string.

4. **Desktop mode ON by default** — `useState(true)` and localStorage defaults to `true`.

5. **SKU in cart sub-label** — cart item rows show `{sku} · $X.XX/each`.

6. **Stock count indicator** — desk mode cards show "N in stock" (orange when < 5).

7. **Bale transfer name preservation** — when a bale is transferred, the target bale's `notes` now carries the original bale's description (if it had one): `{original notes} [from {source business}]`.

### Files Changed

| File | Change |
|------|--------|
| `src/app/api/grocery/desk-products/route.ts` | **New file** — BarcodeInventoryItems with category data |
| `src/app/grocery/pos/page.tsx` | `deskProducts`/`deskCategories` states, `fetchDeskProducts`, category tabs, grid filtering, deskMode=true default, stock indicator |
| `src/app/api/inventory/transfer/route.ts` | Preserve original bale notes on transfer |
