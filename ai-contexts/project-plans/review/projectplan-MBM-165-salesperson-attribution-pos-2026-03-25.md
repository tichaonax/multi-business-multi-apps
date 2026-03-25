# MBM-165 — Salesperson Attribution at POS: Shared Terminal, Per-Sale Assignment

**Date:** 2026-03-25
**Status:** AWAITING APPROVAL

---

## Problem Statement

Multiple salespeople share a single POS terminal (common in clothing retail and restaurant settings). Every sale is currently attributed to whoever is logged in to the app — not necessarily the salesperson who served the customer. Frequent logins/logouts are impractical. There is no mechanism to:

- Select a different salesperson at the time of sale
- Persist that selection across multiple sales on the same terminal
- Reset automatically to the logged-in user when a different person logs in
- Reflect the correct salesperson on the customer-facing display in real time

This leads to inaccurate sales attribution, broken commission reporting, and incorrect leaderboards.

---

## Solution Overview

Add a **Salesperson Selector** widget to every POS checkout flow — positioned alongside the existing "Assign Customer" step. The selected salesperson is persisted in `localStorage` (per-business, per-browser) and is used as the `employeeId` on every order submitted from that terminal. When the session user changes (new login), the selector automatically resets to the newly logged-in user. When the salesperson changes, the customer-facing display immediately updates with the new name and photo.

**No database schema changes are required.** `BusinessOrders.employeeId` already exists and is properly handled by the order APIs.

---

## POS Implementations in Scope

There are **5 POS pages** across the app. Each handles checkout differently:

| POS | File | Checkout Method | Order API |
|---|---|---|---|
| **Clothing** | `src/app/clothing/pos/components/advanced-pos.tsx` | Manual fetch in component | `/api/universal/orders` |
| **Universal / Hardware** | `src/app/universal/pos/page.tsx` | `usePaymentProcessor` hook | `/api/universal/orders` |
| **Restaurant** | `src/app/restaurant/pos/page.tsx` | Direct fetch in `handlePayment` | `/api/restaurant/orders` |
| **Grocery** | `src/app/grocery/pos/page.tsx` | Direct fetch in component | `/api/universal/orders` |
| **Hardware** | `src/app/hardware/pos/page.tsx` | Uses `<UniversalPOS>` component | Covered by Universal |

Hardware POS delegates entirely to the `UniversalPOS` component, so it is automatically covered when Universal POS is updated.

---

## Current State (as-is)

| Concern | Current Behaviour |
|---|---|
| `employeeId` on orders | All POS types hardcode `session?.user?.id` — logged-in user only |
| Salesperson UI | None — no selector exists in any POS |
| localStorage | `pos-customer-${businessId}` for customer; nothing for salesperson |
| Customer display | Shows logged-in user's name/photo via `SET_GREETING` on mount; never updated mid-session |
| **Receipt `salespersonName`** | **All 3 POS types hardcode `session?.user?.name` when building receipt data** |
| Receipt builder | `src/lib/printing/receipt-builder.ts` line 173: `order.employeeName \|\| options.currentUserName \|\| 'Unknown'` |
| Restaurant receipt | `src/app/restaurant/pos/page.tsx` line 1386: `salespersonName: session?.user?.name \|\| 'Staff'` |
| Grocery receipt | `src/app/grocery/pos/page.tsx` line 1531: `salespersonName: sessionUser?.name \|\| 'Staff'` |
| Universal/Clothing receipt | `src/app/universal/pos/hooks/usePaymentProcessor.ts` line 242: `employeeName: session?.user?.name` |
| Universal/Clothing/Grocery API | `employeeId` accepted and resolved (User.id → Employee.id) in `/api/universal/orders/route.ts` |
| Restaurant API | Need to confirm `employeeId` is accepted in `/api/restaurant/orders/route.ts` |
| `/api/employees/me` | **Does not exist** — must resolve current user's employee via the employees list |

---

## Affected Files

| File | Change |
|---|---|
| `src/components/pos/salesperson-selector.tsx` | **NEW** — reusable salesperson picker widget |
| `src/app/clothing/pos/components/advanced-pos.tsx` | Add selector near customer step; pass override to checkout |
| `src/app/universal/pos/page.tsx` | Add selector near CustomerLookup section |
| `src/app/universal/pos/hooks/usePaymentProcessor.ts` | Accept `salespersonEmployeeId` + `salespersonName` in `CheckoutData`; use both in order payload **and receipt data** |
| `src/app/restaurant/pos/page.tsx` | Add selector; override `handlePayment` order payload + `buildReceiptDataFromCompletedOrder` (line 1386) |
| `src/app/grocery/pos/page.tsx` | Add selector; override checkout order payload + `buildReceiptDataFromCompletedOrder` (line 1531) |
| `src/app/customer-display/page.tsx` | Extend `SET_GREETING` handler to also update photo URL |
| `src/app/api/restaurant/orders/route.ts` | Verify `employeeId` is accepted (likely already is) |

---

## Detailed Design

### 1. localStorage Schema

Key: `pos-salesperson-${businessId}`

```json
{
  "employeeId": "emp-uuid",
  "userId": "user-uuid-or-null",
  "name": "Tendai Moyo",
  "photoUrl": "/api/images/abc123"
}
```

`userId` is stored alongside `employeeId` so the POS can detect on mount whether the logged-in user has changed. If `stored.userId !== session.user.id`, the stored selection is stale from a previous login — clear it and resolve fresh from the employee list.

Employees without an app account will have `userId: null` — they can still be selected as a salesperson using their `Employees.id`.

---

### 2. Salesperson Selector Component

**File:** `src/components/pos/salesperson-selector.tsx` (new)

```
┌─────────────────────────────────────────────────────┐
│  Salesperson   [👤 Tendai Moyo ▼]   [Reset to me]   │
└─────────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface SalespersonSelectorProps {
  businessId: string
  currentUserId: string            // session user ID — used to detect login changes
  currentUserName: string          // fallback if no employee record found
  onSalespersonChange: (sp: SelectedSalesperson) => void
}

interface SelectedSalesperson {
  employeeId: string               // Employees.id (the real FK used on orders)
  userId?: string | null           // Users.id — stored for login-change detection
  name: string
  photoUrl?: string | null
}
```

**Initialization on mount:**
1. Fetch `GET /api/employees?businessId=X&status=active` — needed for both dropdown and "me" resolution
2. Read `pos-salesperson-${businessId}` from localStorage
3. If stored and `stored.userId === currentUserId` → restore stored selection (same login session)
4. If stored and `stored.userId !== currentUserId` → new login detected; find `currentUserId` in employee list and use that
5. If not stored → find `currentUserId` in employee list; if not found, fall back to `{ employeeId: currentUserId, userId: currentUserId, name: currentUserName }`
6. Write resolved selection to localStorage and call `onSalespersonChange`

**Rendering:**
- Compact inline row: small avatar (or initials circle) + employee name + dropdown chevron
- "Reset to me" link/button: only visible when `selected.employeeId !== myEmployee.employeeId`
- Dropdown: searchable list of all active employees at the business
- Employee rows show: avatar + name + job title

**On selection change:**
- Update component state
- Write new selection to `localStorage`
- Call `onSalespersonChange(sp)` — parent broadcasts to customer display and stores for checkout

---

### 3. Clothing POS Integration

**File:** `src/app/clothing/pos/components/advanced-pos.tsx`

- Add `selectedSalesperson` state (`SelectedSalesperson | null`)
- Add `broadcastSalespersonChange(sp)` helper that sends `SET_GREETING` via BroadcastChannel
- Render `<SalespersonSelector>` in the customer info section, same row or just above customer lookup
- In order submission:
  ```typescript
  employeeId: selectedSalesperson?.employeeId ?? session?.user?.id
  ```

---

### 4. Universal POS Integration

**File:** `src/app/universal/pos/page.tsx`
**File:** `src/app/universal/pos/hooks/usePaymentProcessor.ts`

Add two fields to `CheckoutData` interface in `usePaymentProcessor.ts`:
```typescript
export interface CheckoutData {
  // ... existing fields ...
  salespersonEmployeeId?: string   // override for order attribution
  salespersonName?: string         // override for receipt display
}
```

In `usePaymentProcessor.ts`, update **both** the order payload and the `OrderData` object used for receipt building:
```typescript
// Order payload — who gets credit for the sale:
employeeId:   checkoutData.salespersonEmployeeId ?? session?.user?.id,

// OrderData for receipt — what name prints on the receipt:
employeeName: checkoutData.salespersonName ?? session?.user?.name,
employeeId:   checkoutData.salespersonEmployeeId ?? session?.user?.id,
```

In `universal/pos/page.tsx`:
- Add `selectedSalesperson` state
- Render `<SalespersonSelector>` in the customer panel (near existing `CustomerLookup`)
- On change: call `broadcastSalespersonChange(sp)` + update state
- Pass both fields when calling `processCheckout()`:
  ```typescript
  salespersonEmployeeId: selectedSalesperson?.employeeId,
  salespersonName: selectedSalesperson?.name,
  ```

---

### 5. Restaurant POS Integration

**File:** `src/app/restaurant/pos/page.tsx`

Restaurant POS does **not** use `usePaymentProcessor` — it calls `/api/restaurant/orders` directly inside its own `handlePayment` function. The integration is the same pattern but applied inline:

- Add `selectedSalesperson` state
- Render `<SalespersonSelector>` near the customer assignment area
- On change: broadcast `SET_GREETING` update to customer display
- In `handlePayment` order payload:
  ```typescript
  employeeId: selectedSalesperson?.employeeId ?? session?.user?.id
  ```
- In `buildReceiptDataFromCompletedOrder` (line 1386), replace both hardcoded session fields:
  ```typescript
  // Before:
  salespersonName: session?.user?.name || 'Staff',
  salespersonId:   session?.user?.id || '',
  // After:
  salespersonName: selectedSalesperson?.name ?? session?.user?.name ?? 'Staff',
  salespersonId:   selectedSalesperson?.employeeId ?? session?.user?.id ?? '',
  ```

Also verify that `/api/restaurant/orders/route.ts` accepts and stores `employeeId` on the created order (likely already does, but must confirm).

---

### 6. Grocery POS Integration

**File:** `src/app/grocery/pos/page.tsx`

Grocery POS calls `/api/universal/orders` directly (not via `usePaymentProcessor`). Same inline pattern:

- Add `selectedSalesperson` state
- Render `<SalespersonSelector>` near the customer section
- On change: broadcast `SET_GREETING` update
- In the checkout order payload:
  ```typescript
  employeeId: selectedSalesperson?.employeeId ?? session?.user?.id
  ```
- In `buildReceiptDataFromCompletedOrder` (line 1531), replace both hardcoded session fields:
  ```typescript
  // Before:
  salespersonName: sessionUser?.name || 'Staff',
  salespersonId:   sessionUser?.id || '',
  // After:
  salespersonName: selectedSalesperson?.name ?? sessionUser?.name ?? 'Staff',
  salespersonId:   selectedSalesperson?.employeeId ?? sessionUser?.id ?? '',
  ```

---

### 7. Customer-Facing Display

**File:** `src/app/customer-display/page.tsx`

The display currently shows the logged-in employee's name and photo fetched once on mount. It will now also respond to salesperson changes broadcast mid-session.

Extend the `SET_GREETING` BroadcastChannel message to carry the photo URL:
```typescript
// In POS (sender):
channel.postMessage({
  type: 'SET_GREETING',
  employeeName: sp.name,
  employeePhotoUrl: sp.photoUrl ?? null,   // new field
})
```

Extend the handler in customer-display:
```typescript
case 'SET_GREETING':
  if (msg.employeeName) setEmployeeName(msg.employeeName)
  if (msg.employeePhotoUrl !== undefined) setEmployeePhotoUrl(msg.employeePhotoUrl)
  break
```

Photo is passed directly in the broadcast (already stored in localStorage from the selector) — no additional API call needed from the display side.

---

## Impact Analysis

| Area | Risk | Notes |
|---|---|---|
| Order attribution | Low | Only changes which `employeeId` is sent; APIs already resolve User.id → Employee.id |
| **Receipt preview** | **Low** | **`salespersonName` on printed/previewed receipts updated to reflect selected salesperson** |
| Receipt builder | None | `receipt-builder.ts` already uses `order.employeeName` — no change needed there |
| Restaurant receipt | Low | `buildReceiptDataFromCompletedOrder` line 1386 — replace 2 session fields |
| Grocery receipt | Low | `buildReceiptDataFromCompletedOrder` line 1531 — replace 2 session fields |
| Universal/Clothing receipt | Low | `usePaymentProcessor` OrderData object lines 242-243 — replace 2 session fields |
| Clothing POS | Low | One new state + one component render |
| Universal/Hardware POS | Low | Two interface fields + two lines in hook |
| Restaurant POS | Low | Client: selector + receipt fix. **API change also required**: restaurant API always resolves employee from session — must accept `salespersonEmployeeId` in request body |
| Grocery POS | Low | Client: selector + receipt fix. **Bug fix bundled**: `employeeId` was defined but never included in `orderData` — grocery orders had no employee attribution at all |
| Historical orders | None | No backfill — existing orders untouched |
| Database | None | No schema changes required |
| Customer display | Low | Extends existing `SET_GREETING` message — backwards compatible |
| Reporting | Positive | Sales attributed to actual salesperson, fixing commission accuracy |

---

## Todo Items

### Phase 1: Investigation & API Check

- [x] **1.1** Read `src/app/api/restaurant/orders/route.ts` — **FINDING: API does NOT accept client-supplied `employeeId`**. Lines 344–358 always resolve employee server-side via `prisma.employees.findFirst({ where: { userId: user.id } })`. We must update the restaurant API to accept `salespersonEmployeeId` from the request body and use it when provided. Added as step 5.0.
- [x] **1.2** Employee API confirmed: returns `profilePhotoUrl: employee.profilePhotoUrl ?? null` as a direct usable URL string. No transformation needed in the selector.
- [x] **1.3** Grocery POS finding: `employeeId = sessionUser?.id` is defined at line 390 but **never included in `orderData`** (lines 1370–1435). The order is submitted with no `employeeId` field at all. Must add it explicitly. Added as step 6.0.

---

### Phase 2: Salesperson Selector Component

**File:** `src/components/pos/salesperson-selector.tsx` (new)

- [x] **2.1** Create component with props `businessId`, `currentUserId`, `currentUserName`, `onSalespersonChange`
- [x] **2.2** On mount: fetch employee list; resolve "me" from employees where `employee.userId === currentUserId`
- [x] **2.3** Read localStorage; if `stored.userId !== currentUserId` treat as stale and reset to resolved "me"
- [x] **2.4** Render compact inline widget: initials/avatar circle + name + dropdown chevron
- [x] **2.5** Dropdown: searchable list of active employees from fetched list
- [x] **2.6** On selection: update state, persist to localStorage, call `onSalespersonChange`
- [x] **2.7** Show "Reset to me" button when selected employee ≠ current user's employee
- [x] **2.8** Handle: loading state (skeleton), no employees returned (show name only, no dropdown), error fetching

---

### Phase 3: Clothing POS Integration

**File:** `src/app/clothing/pos/components/advanced-pos.tsx`

- [x] **3.1** Add `selectedSalesperson: SelectedSalesperson | null` state
- [x] **3.2** Add `broadcastSalespersonChange(sp)` using existing BroadcastChannel reference in the component
- [x] **3.3** Render `<SalespersonSelector>` in the customer section (above or alongside customer lookup)
- [x] **3.4** Replace `employeeId: session?.user?.id` in order payload with `selectedSalesperson?.employeeId ?? session?.user?.id`
- [x] **3.5** Identify where receipt data is built in clothing POS; replace any session-based `salespersonName`/`salespersonId` fields with selected salesperson values

---

### Phase 4: Universal POS Integration

**File:** `src/app/universal/pos/hooks/usePaymentProcessor.ts`
**File:** `src/app/universal/pos/page.tsx`

- [x] **4.1** Add `salespersonEmployeeId?: string` and `salespersonName?: string` to `CheckoutData` interface
- [x] **4.2** In hook, replace `employeeId: session?.user?.id` with `checkoutData.salespersonEmployeeId ?? session?.user?.id`
- [x] **4.3** In hook, replace `employeeName: session?.user?.name` (line 242) with `checkoutData.salespersonName ?? session?.user?.name` — this feeds the receipt builder
- [x] **4.4** Add `selectedSalesperson` state to `universal/pos/page.tsx`
- [x] **4.5** Render `<SalespersonSelector>` alongside `CustomerLookup`
- [x] **4.6** On change: broadcast `SET_GREETING`; pass both `salespersonEmployeeId` and `salespersonName` into `processCheckout()`

---

### Phase 5: Restaurant POS Integration

**File:** `src/app/api/restaurant/orders/route.ts`
**File:** `src/app/restaurant/pos/page.tsx`

- [x] **5.0** Update `/api/restaurant/orders` POST handler (lines 344–358): accept optional `salespersonEmployeeId` from request body; if provided, skip the session-based employee lookup and use it directly as `employeeId` on the order
- [x] **5.1** Add `selectedSalesperson` state to `restaurant/pos/page.tsx`
- [x] **5.2** Render `<SalespersonSelector>` near customer assignment area
- [x] **5.3** On change: broadcast `SET_GREETING` to customer display
- [x] **5.4** Add `salespersonEmployeeId: selectedSalesperson?.employeeId` to `requestBody` in the order fetch call (line 2053)
- [x] **5.5** In `buildReceiptDataFromCompletedOrder` (line 1386), replace `session?.user?.name` and `session?.user?.id` with `selectedSalesperson?.name` and `selectedSalesperson?.employeeId` (with session fallbacks)

---

### Phase 6: Grocery POS Integration

**File:** `src/app/grocery/pos/page.tsx`

- [x] **6.0** `employeeId` is defined but missing from `orderData` (line 1370). Add `employeeId: selectedSalesperson?.employeeId ?? sessionUser?.id` to the `orderData` object — grocery orders currently submit with no `employeeId` at all
- [x] **6.1** Add `selectedSalesperson` state
- [x] **6.2** Render `<SalespersonSelector>` near customer section
- [x] **6.3** On change: broadcast `SET_GREETING` to customer display
- [x] **6.4** In `buildReceiptDataFromCompletedOrder` (line 1531), replace `sessionUser?.name` and `sessionUser?.id` with `selectedSalesperson?.name` and `selectedSalesperson?.employeeId` (with session fallbacks)

---

### Phase 7: Customer-Facing Display

**File:** `src/app/customer-display/page.tsx`

- [x] **7.1** Extend `SET_GREETING` handler to also accept and apply `employeePhotoUrl`
- [x] **7.2** Verify photo and name both update immediately when salesperson changes mid-session

---

### Phase 8: Manual Testing Checklist

- [ ] **8.1** Clothing POS: open → salesperson defaults to logged-in user
- [ ] **8.2** Clothing POS: change salesperson → customer display immediately shows new name + photo
- [ ] **8.3** Clothing POS: complete sale → admin order shows `employeeId` of selected salesperson
- [ ] **8.4** Clothing POS: receipt preview and printed receipt show selected salesperson name (not logged-in user)
- [ ] **8.5** Refresh page → salesperson selection persists from localStorage
- [ ] **8.6** Log out / log in as different user → salesperson resets to new user automatically
- [ ] **8.7** "Reset to me" restores session user, broadcasts update, and next receipt shows session user name
- [ ] **8.8** Restaurant POS: repeat tests 8.1–8.7
- [ ] **8.9** Grocery POS: repeat tests 8.1–8.7
- [ ] **8.10** Universal POS: repeat tests 8.1–8.7
- [ ] **8.11** Employee with no app account (userId=null): can be selected; order and receipt both reflect their name
- [ ] **8.12** Hardware POS: verify it inherits changes from Universal POS automatically

---

## Open Questions / Decisions

1. **Placement**: Compact pill next to customer lookup (one row), or its own dedicated row below customer? (Recommend: same section, just below customer — minimal vertical space)
2. **Permission gate**: Any cashier can change the salesperson, or managers only? (Recommend: any cashier — it's operational, not administrative)
3. **Per-order reset**: Should the selection auto-clear after each completed sale, or persist? (Recommend: persist — the whole point is avoiding repeated selection)
4. **Employees with no app account**: Selectable via dropdown using their `Employees.id` directly — `userId` stored as `null`. This is correct behaviour.

---

## Review

*(To be completed after implementation)*
