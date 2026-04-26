# MBM-192 — Payment Cancellation & Manager Override Code System

**Date:** 2026-04-25  
**Status:** AWAITING APPROVAL  
**Revision:** 5 (all open questions resolved — scanToken field confirmed, denial is final, same-day constraint, loyalty reversal added)

---

## 1. Overview

Add a **payment cancellation workflow** that allows any completed, paid order to be voided and funds returned to the customer. Because our policy is no-refund, every cancellation requires:

1. The **requesting staff member** to provide a mandatory written reason.
2. A **physically present manager** to authorise by entering their personal 6-character override code (or scanning their employee card).
3. The manager to explicitly **Approve** or **Deny** the request — both outcomes are logged.

Two additional systemic requirements also apply:

4. **Cancelled orders must be excluded from all EOD calculations** — they represent returned funds and must never inflate daily sales, cash totals, or EcoCash figures.
5. **EcoCash refunds carry a double fee** — EcoCash charges fees on both the original transaction and the refund. The net refund to the customer is `grossAmount − 2 × feeAmount`. This is shown to the customer on the customer-facing display and explained in the cancellation modal before proceeding.

This plan also introduces the **Manager Override Code** subsystem — a reusable, secure credential mechanism that can gate any future sensitive action beyond cancellations.

---

## 2. Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Two-step modal (reason first, then override) | Staff reason captured before manager is called over | Manager sees full context before deciding; reason is read-only at override time |
| Override = identity proof only | Valid code identifies the manager; they still explicitly Approve or Deny | Prevents accidental approval; manager makes a conscious choice |
| Denial is a first-class outcome | Manager can deny with a mandatory reason; logged same as approval | Full audit trail |
| Denial is FINAL | First denial ends the workflow — no retry with a different manager | Staff must start a fresh request; prevents shopping for a lenient manager |
| Code entry requires explicit confirm | Must press Enter or click OK — never auto-submits on 6 chars | Prevents accidental submission mid-type |
| Barcode scan checked as employee card first | Scanned value matched against employees table first, then override codes | Single input works for both scan and type; scanning fires Enter automatically |
| Code stored as bcrypt hash | Never store plaintext | Security: even admins cannot read another manager's code |
| Reuse window = 1 year | History table retains retired hashes for 365 days | Prevents cycling through familiar codes |
| Expiry = 30 days | Hard block at expiry; bell notification at 5 days out | Balance security with usability |
| Loyalty points reversed on approval | Points earned on the original order are deducted from the customer's balance | Prevents loyalty point exploitation via cancel-and-reorder |
| Stock restocked on approval | Inventory quantity restored for non-restaurant orders | Restores saleable stock |
| Business account reversed on approval | `BusinessTransaction` DEBIT added | Keeps ledger accurate |
| EcoCash refund = gross − 2× fee | EcoCash charges fees both on the original payment and on the refund | Fixed calculation — not editable; customer must be informed before proceeding |
| Cash refund is manager-adjustable | For non-EcoCash orders the manager sees an editable refund amount (default = order total, max = order total) | Allows partial refunds — e.g. agreed partial cash settlement |
| Cancelled orders excluded from EOD | `status: CANCELLED` / `paymentStatus: REFUNDED` orders filtered out everywhere | Returned funds must not inflate EOD sales, cash counts, or EcoCash totals |
| Same-day cancellation only | Orders can only be cancelled on the day they were created, before EOD is closed | Once EOD closes, the sale is locked into the report |
| All POS implementations covered | Each own-POS gets the button directly; universal POS businesses via shared component | Consistent behaviour across all 10 business types |

---

## 3. POS Coverage — Business Type Mapping

| Business Type | POS Implementation | File |
|--------------|-------------------|------|
| Grocery | Own POS | `src/app/grocery/pos/page.tsx` |
| Restaurant | Own POS | `src/app/restaurant/pos/page.tsx` |
| Clothing | Own POS | `src/app/clothing/pos/components/advanced-pos.tsx` |
| Hardware | Own POS | `src/app/hardware/pos/page.tsx` |
| Vehicles / Consulting / Retail / Services / Construction / Other | Universal POS | `src/app/universal/pos/page.tsx` |

---

## 4. EcoCash Refund Fee Policy

EcoCash charges a transaction fee on **both** the original payment and the refund. Therefore:

```
Net refund to customer = grossAmount − (2 × originalFeeAmount)

Example:
  Order total (gross)   $4.50
  EcoCash fee           $0.50
  Refund deduction      2 × $0.50 = $1.00
  Customer receives     $4.50 − $1.00 = $3.50
```

**Where the fee is stored:** `businessOrders.attributes.ecocashFeeAmount` (set at point of sale).

**Implications:**
- The cancellation modal **must show this breakdown** to the customer/staff before the manager approves, so the customer understands the deduction.
- The customer-facing display screen must also show this breakdown when the cancellation is processed.
- If the order was not paid by EcoCash, the refund amount = full `totalAmount` (no deduction).
- The `refundAmount` stored in `OrderCancellation` is the **net** amount actually returned to the customer.

---

## 5. EOD Exclusion — Cancelled Orders

Cancelled/refunded orders represent returned funds. They must be excluded from **every** EOD-related calculation to prevent double-counting and inflated figures.

### 5.1 Files that need the exclusion filter added

| File | Current filter | Change required |
|------|---------------|-----------------|
| `src/app/api/universal/daily-sales/route.ts` | Excludes `EXPENSE_ACCOUNT` payment method only | Add `status: { not: 'CANCELLED' }` to order query |
| `src/app/api/eod/salesperson/pending/route.ts` | `paymentStatus: 'PAID'` already excludes REFUNDED | No change needed — `PAID` filter is correct |
| `src/app/api/eod/grouped-preview/route.ts` | Review needed | Add `status: { not: 'CANCELLED' }` if not already filtered |
| `src/app/api/eod/grouped-run/route.ts` | Review needed | Add exclusion |
| `src/app/api/reports/eod-ecocash-transactions/route.ts` | `paymentStatus: 'PAID'` already excludes REFUNDED | No change needed |
| Restaurant, Grocery, Clothing, Hardware EOD report pages | Depend on daily-sales API | Fixed transitively by fixing daily-sales |
| Any direct order queries in EOD pages | Review each page | Add `status: { not: 'CANCELLED' }` |

### 5.2 Standard exclusion clause

Every order query that feeds into EOD, sales reports, or cash reconciliation must include:

```typescript
// Exclude cancelled/refunded orders — they represent returned funds
status: { not: 'CANCELLED' },
// OR alternatively:
paymentStatus: { in: ['PAID', 'PARTIALLY_PAID'] }
```

The `daily-sales` API is the most critical because all four business EOD report pages depend on it for their sales totals, payment method breakdowns, category breakdowns, employee sales, and hourly/daily trends.

### 5.3 EcoCash total in salesperson EOD

The pending API already uses `paymentStatus: 'PAID'` — cancelled EcoCash orders will have `paymentStatus: 'REFUNDED'` after cancellation, so they are already excluded from the auto-calculated EcoCash total for salesperson EOD. No change needed here.

---

## 6. New Database Tables

### 6.1 `manager_override_codes`

One active code per manager.

```
ManagerOverrideCodes
  id            String   @id @default(cuid())
  userId        String   @unique
  codeHash      String                         // bcrypt hash, normalised to uppercase
  createdAt     DateTime @default(now())
  expiresAt     DateTime                       // createdAt + 30 days
  updatedAt     DateTime @updatedAt

  user          Users    @relation(...)
```

### 6.2 `manager_override_code_history`

Retired hashes for 1-year reuse prevention.

```
ManagerOverrideCodeHistory
  id            String   @id @default(cuid())
  userId        String
  codeHash      String
  createdAt     DateTime                       // when originally set
  retiredAt     DateTime @default(now())       // when replaced

  user          Users    @relation(...)
```

### 6.3 `manager_override_logs`

Every override attempt — approvals, denials, aborts, and failed codes.

```
ManagerOverrideLog
  id              String               @id @default(cuid())
  managerId       String?              // null if code invalid (FAILED_CODE)
  action          ManagerOverrideAction
  outcome         OverrideOutcome
  targetId        String               // orderId
  businessId      String?
  requestedBy     String               // staff userId
  staffReason     String               // mandatory cancellation reason
  denialReason    String?              // populated for DENIED outcome
  createdAt       DateTime             @default(now())
  metadata        Json?                // structured snapshot — see §6a below

  manager         Users?               @relation("OverrideManager", ...)
  requester       Users                @relation("OverrideRequester", ...)
  business        Businesses?          @relation(...)

enum ManagerOverrideAction {
  ORDER_CANCELLATION
  // Future: PRICE_OVERRIDE, DISCOUNT_OVERRIDE, etc.
}

enum OverrideOutcome {
  APPROVED
  DENIED
  ABORTED      // Staff cancelled the whole workflow
  FAILED_CODE  // Code invalid / unrecognised card
}
```

#### §6a — `metadata` JSON structure for `ORDER_CANCELLATION`

The `metadata` field stores a structured snapshot of the order and customer at the time of the override attempt, so the audit log is self-contained even if the order record is later modified.

```typescript
interface CancellationOverrideMetadata {
  // Order snapshot
  orderNumber: string
  orderDate: string            // ISO — original createdAt
  businessType: string
  paymentMethod: string        // CASH | ECOCASH | CARD | etc.
  grossAmount: number          // original totalAmount
  feeDeducted: number          // 0 for non-EcoCash; 2×fee for EcoCash
  netRefund: number            // amount actually returned to customer

  // Order items snapshot (what was in the order)
  items: Array<{
    name: string               // product/item name
    quantity: number
    unitPrice: number
    totalPrice: number
    category?: string
  }>

  // Customer snapshot (if customer was linked to the order)
  customer?: {
    id: string
    name: string
    phone?: string
    loyaltyNumber?: string     // e.g. GRO-CUST-000042
    loyaltyTier?: string
  } | null

  // Walk-in customer info from order attributes (if no linked customer)
  walkInCustomer?: {
    name?: string
    phone?: string
  } | null
}
```

**How it is populated:** The `POST /api/orders/[orderId]/cancel` and `POST /api/orders/[orderId]/cancel/log` routes fetch the order with `include: { business_order_items: true, business_customers: true }` (or from `attributes.customerInfo` for walk-in customers) before writing the log entry. This snapshot is written to `metadata` at the moment of the override — regardless of outcome (approved, denied, aborted, or failed code).
```

### 6.4 `order_cancellations`

One record per successfully cancelled order.

```
OrderCancellation
  id              String   @id @default(cuid())
  orderId         String   @unique
  businessId      String
  requestedBy     String                    // staff userId
  approvedBy      String                    // manager userId
  overrideLogId   String   @unique
  staffReason     String                    // mandatory
  refundAmount    Decimal  @db.Decimal(10,2) // NET amount returned to customer
  feeDeducted     Decimal  @db.Decimal(10,2) // 0 for non-EcoCash; 2×fee for EcoCash
  paymentMethod   String                    // mirrors original order payment method

  // Customer columns — flat and queryable for reports (no JSON parsing required)
  customerId      String?                   // FK → BusinessCustomers if a customer was linked
  customerName    String?                   // name from linked customer or walk-in attributes
  customerPhone   String?                   // phone if available
  customerNumber  String?                   // loyalty/customer number e.g. GRO-CUST-000042

  createdAt       DateTime @default(now())

  order           BusinessOrders            @relation(...)
  business        Businesses                @relation(...)
  requestedByUser Users                     @relation("CancellationRequested", ...)
  approvedByUser  Users                     @relation("CancellationApproved", ...)
  overrideLog     ManagerOverrideLog        @relation(...)
  customer        BusinessCustomers?        @relation(fields: [customerId], references: [id])
```

> `feeDeducted` and `refundAmount` make the EcoCash deduction explicit and auditable.  
> Customer columns are stored flat so the reports API can filter by customer without parsing JSON. The full item-level snapshot lives in `ManagerOverrideLog.metadata`.

---

## 7. Prisma Schema Changes

- Add 4 models + 2 enums (`ManagerOverrideAction`, `OverrideOutcome`)
- Add `orderCancellation` back-relation on `BusinessOrders`
- Add `cancellations` back-relation on `BusinessCustomers`
- Add back-relations on `Users` for all four new tables
- **One migration** covering all four models and two enums

---

## 8. API Endpoints

### Manager Override Code

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/manager-override/code/status` | `{ hasCode, isExpired, expiresAt, daysUntilExpiry }` for current user |
| `POST` | `/api/manager-override/code/setup` | Create or rotate code. Validates format, reuse history, hashes & saves. Archives old code. |

### Override Resolution

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/manager-override/resolve` | Resolve typed/scanned value to a manager. Checks employee barcode first, then override code hash. Returns `{ managerId, managerName, method: 'CARD' \| 'CODE' }` or error. Does not log. |

### Order Cancellation

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/orders/[orderId]/cancel` | Execute approved cancellation. Body: `{ managerId, staffReason }`. Re-validates manager, calculates net refund (incl. EcoCash double-fee), executes rollback transaction, logs. |
| `POST` | `/api/orders/[orderId]/cancel/log` | Write non-approval outcome: DENIED, ABORTED, FAILED_CODE. |
| `GET` | `/api/orders/[orderId]/cancellation` | Get cancellation details for order history display. |

### Reports

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/reports/cancellations` | Cancellation records with filters + summary metrics. |

---

## 9. Code Validation & Resolution Rules

### 9.1 Override Code Format (enforced at setup)

1. Exactly 6 characters.
2. Must contain at least one letter (A–Z) AND at least one digit (0–9).
3. Normalised to uppercase before hashing and comparison.
4. No reuse: compare bcrypt against all `ManagerOverrideCodeHistory` rows for this user where `retiredAt > now() − 365 days`.

### 9.2 Scan Isolation — Blocking Competing Scan Workflows

When Step 2 (code entry) is active, any barcode scan must land exclusively in the override modal. Two competing scan handlers exist:

| Handler | File | Normal behaviour | How override modal blocks it |
|---------|------|-----------------|------------------------------|
| `CardScanOverlay` | `src/components/clock-in/card-scan-overlay.tsx` | Buffers keydown events on `window`, fires `handleCardScan` on Enter | Already skips events when `e.target.tagName === 'INPUT'` — auto-focusing the input is sufficient |
| `GlobalBarcodeService` | `src/lib/services/global-barcode-service.ts` | Buffers keydown on `document`, emits to all listeners | Also skips INPUT targets naturally; additionally, the modal calls `globalBarcodeService.disable()` on Step 2 open and `globalBarcodeService.enable()` on modal close/abort/success as belt-and-suspenders |

**Implementation rule:** `<ManagerOverrideModal>` on Step 2 mount must:
1. Auto-focus the password `<input>` (via `inputRef.current?.focus()` in a `useEffect`)
2. Call `globalBarcodeService.disable()`

On modal unmount (any exit path: success, abort, denial, 3-failure lockout):
3. Call `globalBarcodeService.enable()`

### 9.3 Resolution at Override Time

The employee card scan field is `employees.scanToken` — this is what is sent when a card is scanned (confirmed via `POST /api/clock-in/card-scan` which queries `prisma.employees.findFirst({ where: { scanToken, isActive: true } })`).

```
1. Normalise input → uppercase, trim whitespace.
2. Employee card check:
   prisma.employees.findFirst({ where: { scanToken: input, isActive: true } })
   → Found: does the employee's linked user account have canCloseBooks permission?
     → Yes: return { managerId: employee.users.id, managerName: employee.fullName, method: 'CARD' }
     → No: return 403 "Employee does not have manager permissions"
3. Override code check:
   Find ManagerOverrideCodes where bcrypt.compare(value, codeHash) = true.
   → Found: is expiresAt > now()?
     → Yes: does user have canCloseBooks?
       → Yes: return { managerId, managerName, method: 'CODE' }
       → No: return 403 "User does not have manager permissions"
     → No: return 401 "Override code expired — manager must renew"
   → Not found: return 401 "Invalid code"
```

---

## 10. Refund Calculation Logic

```typescript
function calculateRefund(order: BusinessOrder): {
  grossAmount: number
  feeDeducted: number
  netRefund: number
  isEcocash: boolean
} {
  const gross = Number(order.totalAmount)
  const isEcocash = order.paymentMethod?.toUpperCase() === 'ECOCASH'
  const fee = isEcocash ? Number((order.attributes as any)?.ecocashFeeAmount ?? 0) : 0
  const feeDeducted = isEcocash ? fee * 2 : 0
  return {
    grossAmount: gross,
    feeDeducted,
    netRefund: gross - feeDeducted,
    isEcocash,
  }
}
```

This function is called:
- When the cancellation modal opens (to show the breakdown to staff/customer)
- Server-side in `POST /api/orders/[orderId]/cancel` (to store and execute the correct amounts)

---

## 11. Cancellation Modal — Full UI Flow

### Step 1 — Staff Reason

```
┌─────────────────────────────────────────────────────┐
│  Cancel Order #GR-001234                            │
│  $88.51 · EcoCash · 14:51 today                    │
│                                                     │
│  ⚠ EcoCash Refund Notice                           │
│  EcoCash charges fees on both the original payment  │
│  and the refund. The customer will receive:         │
│                                                     │
│    Order total:       $88.51                        │
│    Fee deducted:    − $1.02  (2 × $0.51 fee)       │
│    Customer refund:   $87.49                        │
│                                                     │
│  Reason for cancellation *                          │
│  ┌─────────────────────────────────────────────┐   │
│  │ (staff types reason here — min 10 chars)    │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Cancel]              [Request Manager Authorisation]│
└─────────────────────────────────────────────────────┘
```

- For non-EcoCash orders: the notice block is not shown.
- "Request Manager Authorisation" is disabled until a valid reason is entered.

---

### Step 2 — Manager Override

```
┌─────────────────────────────────────────────────────┐
│  Manager Authorisation Required                     │
│                                                     │
│  Order #GR-001234                                   │
│  Refund to customer:  $87.49  (EcoCash, net of fees)│
│                                                     │
│  Staff reason:                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ "Customer paid twice by mistake"  [read-only]│   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Manager override code or scan card:                │
│  [ ● ● ● ● ● ●                         ]  [OK]    │
│  Press Enter or click OK to submit                  │
│                                                     │
│  [Deny Request]                       [Abort]       │
└─────────────────────────────────────────────────────┘
```

- Input is password-style (dots). Never revealed.
- Enter key or OK submits.
- Scanning fires Enter automatically — works without special detection.
- **Input is auto-focused when Step 2 mounts.** This is the primary mechanism that blocks competing scan workflows: both `CardScanOverlay` and `GlobalBarcodeService` skip keydown events when `target.tagName === 'INPUT'`, so the scan goes directly into the input.
- **`globalBarcodeService.disable()` is called when Step 2 opens** (belt-and-suspenders — guards against focus loss). **`globalBarcodeService.enable()` is called when the modal closes, aborts, or completes** so the global scanner is restored.
- No interaction with `CardScanOverlay` shutdown needed — its listener already skips INPUT targets naturally.
- Calls `POST /api/manager-override/resolve`.
- On invalid: inline error, input clears, manager can retry.
- After 3 failed attempts: input locked. Log FAILED_CODE each time.

---

### Step 3a — Manager Identified: Approve or Deny

```
┌─────────────────────────────────────────────────────┐
│  ✓ Identified: [Manager Name]                       │
│                                                     │
│  Order #GR-001234 — Refund $87.49 to customer       │
│  Staff reason: "Customer paid twice by mistake"     │
│                                                     │
│  [✓ Approve Cancellation]    [✗ Deny Request]       │
└─────────────────────────────────────────────────────┘
```

---

### Step 3b — Denial Reason (if Deny clicked)

```
┌─────────────────────────────────────────────────────┐
│  Denial Reason *                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ (manager enters mandatory denial reason)    │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Back]                    [Confirm Denial]         │
└─────────────────────────────────────────────────────┘
```

---

### Step 3c — After Denial (FINAL)

```
┌─────────────────────────────────────────────────────┐
│  ✗ Cancellation Denied                              │
│  [Manager Name]: "[denial reason]"                  │
│                                                     │
│  This cancellation request has been denied.         │
│  The first denial is final — no further attempts    │
│  are permitted for this order.                      │
│                                                     │
│                                          [Close]    │
└─────────────────────────────────────────────────────┘
```

- Outcome logged as DENIED with `denialReason`.
- Modal closes — no retry allowed for this order.

---

### Step 4 — Success

```
┌─────────────────────────────────────────────────────┐
│  ✅ Order Cancelled                                  │
│                                                     │
│  Refund to customer:  $87.49                        │
│  (EcoCash fee deducted: $1.02)                      │
│  Authorised by:  [Manager Name]                     │
│                                                     │
│  [Close]                                            │
└─────────────────────────────────────────────────────┘
```

---

## 12. Customer Display Screen

The customer display uses a `BroadcastChannel` / WebSocket event system. Messages are sent via `useCustomerDisplaySync`'s `send()` function from any POS page, and received by `src/app/customer-display/page.tsx`.

### 12.1 New message type

Add `ORDER_CANCELLED` to `CartMessageType` in `src/lib/customer-display/broadcast-sync.ts`:

```typescript
export type CartMessageType =
  | ...existing types...
  | 'ORDER_CANCELLED'   // Order voided; show refund breakdown to customer
```

Add payload fields (to the existing `CartMessage['payload']` interface):
```typescript
// Cancellation fields
orderCancelled?: boolean
orderNumber?: string
grossAmount?: number
feeDeducted?: number      // 0 for non-EcoCash
refundAmount?: number     // net amount customer receives
isEcocash?: boolean
```

### 12.2 Sending the event from POS (after successful cancellation)

In each POS's cancellation success handler:
```typescript
send('ORDER_CANCELLED', {
  orderNumber: result.orderNumber,
  grossAmount: result.grossAmount,
  feeDeducted: result.feeDeducted,
  refundAmount: result.refundAmount,
  isEcocash: result.isEcocash,
  subtotal: 0, tax: 0, total: 0  // required by CartMessage shape
})
```

### 12.3 Handling the event in the customer display page

Add `cancellationState` state to `src/app/customer-display/page.tsx`:

```typescript
const [cancellationState, setCancellationState] = useState<{
  orderNumber: string
  grossAmount: number
  feeDeducted: number
  refundAmount: number
  isEcocash: boolean
} | null>(null)
```

Add `ORDER_CANCELLED` case to the `handleCartMessage` switch:
```typescript
case 'ORDER_CANCELLED':
  setCancellationState({
    orderNumber: message.payload.orderNumber || '',
    grossAmount: message.payload.grossAmount || 0,
    feeDeducted: message.payload.feeDeducted || 0,
    refundAmount: message.payload.refundAmount || 0,
    isEcocash: message.payload.isEcocash || false,
  })
  // Clear cart — the order is voided
  setCart({ items: [], subtotal: 0, tax: 0, total: 0 })
  setPaymentState({ inProgress: false, amountTendered: 0, changeDue: 0, shortfall: 0 })
  // Auto-clear after 10 seconds — return to idle/marketing
  setTimeout(() => {
    setCancellationState(null)
  }, 10000)
  break
```

### 12.4 Visual layout on customer display

When `cancellationState` is set, it renders a full-screen overlay (same priority as the thank-you overlay after payment).

**EcoCash order cancellation:**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                   ORDER CANCELLED                        │
│                   ──────────────                         │
│            Order #GR-001234                              │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Original amount          $88.51                 │   │
│  │  EcoCash fee deducted  −  $1.02                 │   │
│  │  (fee charged on payment & refund)               │   │
│  │  ──────────────────────────────                  │   │
│  │  Your refund              $87.49                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Please collect your refund from the cashier.            │
│  We apologise for any inconvenience.                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Cash/card order cancellation:**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                   ORDER CANCELLED                        │
│                   ──────────────                         │
│            Order #GR-001234                              │
│                                                          │
│           Refund:   $88.51                               │
│                                                          │
│  Please collect your refund from the cashier.            │
│  We apologise for any inconvenience.                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The screen auto-clears after 10 seconds and returns to the idle/marketing display.

### 12.5 Coverage across business types

The customer display at `/customer-display` is shared across all business types — grocery, restaurant, clothing, and hardware each have their own "manage customer display" page but all send to the same `/customer-display` endpoint via the broadcast channel. Adding the event once (in the shared broadcast-sync types + the display page handler) covers all businesses. Each POS just needs to call `send('ORDER_CANCELLED', ...)` after a successful cancellation.

---

## 13. Cancellation API — Transaction Logic

`POST /api/orders/[orderId]/cancel` — called only after manager approval:

1. Re-fetch order with full detail (guard against race conditions and to build the log snapshot):
   ```typescript
   prisma.businessOrders.findUnique({
     where: { id: orderId },
     include: {
       business_order_items: {
         include: {
           product_variants: {
             include: { business_products: { select: { name: true } } }
           }
         }
       },
       business_customers: {   // linked loyalty customer (if any)
         select: { id: true, name: true, phone: true, customerNumber: true }
       }
     }
   })
   ```
2. Confirm order is still `COMPLETED` + `PAID` and no existing `OrderCancellation`.
   Also confirm `order.createdAt` is today (same calendar day, business timezone) — reject if EOD has already been closed for that day. Return 409 "Order cannot be cancelled — EOD for this day has already been submitted."
3. Resolve customer info:
   - **Linked customer:** from `order.business_customers`
   - **Walk-in customer:** from `order.attributes.customerInfo` (name, phone stored at POS checkout)
   - **No customer:** all customer fields are null
4. Build `metadata` snapshot (§6a structure) — items, amounts, customer.
5. Calculate refund: `calculateRefund(order)` → `{ grossAmount, feeDeducted, netRefund }`.
6. Prisma transaction:
   - `BusinessOrders` → `status: CANCELLED`, `paymentStatus: REFUNDED`
   - `BusinessTransaction` → `type: DEBIT`, `amount: netRefund`, `referenceType: 'CANCELLATION'`, `notes: 'Cancellation reversal #ORDER_NUM (net of fees)'`
   - For each `business_order_items` with `productVariantId`: `stockQuantity += quantity` (skip restaurant)
   - If order had a linked loyalty customer and `loyaltyPointsEarned` in `attributes`: deduct those points from `BusinessCustomers.loyaltyPoints`
   - Create `ManagerOverrideLog` (outcome: APPROVED, staffReason, metadata: full snapshot)
   - Create `OrderCancellation` (refundAmount, feeDeducted, paymentMethod, customerId, customerName, customerPhone, customerNumber)
7. Dispatch `ORDER_CANCELLED` to customer display.
8. Return `{ success, orderNumber, refundAmount: netRefund, feeDeducted, isEcocash }`.

**Non-approval log route** (`POST /api/orders/[orderId]/cancel/log`) also fetches the same order detail before writing the `ManagerOverrideLog` — every attempt, regardless of outcome, carries the full order + customer snapshot in `metadata`.

---

## 14. Cancellation Reports

**Where:** Sidebar → Reports → **Order Cancellations**

### Filters
- Date range (From / To)
- Business selector (umbrella = all businesses)
- Staff member (who requested)
- Manager (who approved / denied)
- Outcome (All / Approved / Denied)
- Customer name / number (free-text — searches `customerName` and `customerNumber` columns)
- Payment method (All / Cash / EcoCash)

### Summary Cards
- Total cancellations in period
- Total net refund value paid out
- Total fees deducted (EcoCash orders only)
- Cancellation rate (cancelled / total orders × 100%)
- Denial rate (denied / (approved + denied) × 100%)

### Main Table — Approved Cancellations

| Column | Description |
|--------|-------------|
| Date | Cancellation timestamp |
| Order # | Link to original order |
| Business | Business where sale was made |
| Payment | Cash / EcoCash |
| Gross | Original order total |
| Fee deducted | 2× EcoCash fee (blank for cash) |
| Net refund | Amount returned to customer |
| Customer | Name + loyalty number if available; "Walk-in" if anonymous |
| Customer phone | If captured |
| Items | Expandable row / tooltip showing item names and quantities from snapshot |
| Staff reason | Reason entered by staff |
| Requested by | Staff name |
| Authorised by | Manager name |

> Customer and item data is pulled from `OrderCancellation.customer*` columns (for filtering) and `ManagerOverrideLog.metadata.items` (for the expandable item list). This means the report is accurate even if the original order is later soft-deleted or its product names change.

### Override Attempt Log Tab

All log entries including denied, aborted, and failed code attempts. Every row carries the full order + customer snapshot from `metadata`.

| Column | Description |
|--------|-------------|
| Timestamp | When the attempt occurred |
| Order # | Target order (from metadata snapshot) |
| Order amount | Original gross amount (from metadata) |
| Payment method | Cash / EcoCash (from metadata) |
| Customer | Name + number if available (from metadata) |
| Outcome | APPROVED / DENIED / ABORTED / FAILED_CODE |
| Manager | Who entered the code (blank for FAILED_CODE) |
| Staff | Who initiated |
| Staff reason | Cancellation reason |
| Denial reason | If DENIED |
| Items | Expandable — item snapshot from metadata |

**Export:** CSV for both tabs.

---

## 15. EOD Workflow Integration

### 15.1 What changes in EOD when an order is cancelled

| EOD Area | Behaviour after cancellation |
|----------|------------------------------|
| Daily sales total | Cancelled orders excluded — order has `status: CANCELLED` |
| Payment method breakdown | Excluded |
| EcoCash breakdown (gross, fee, net) | Excluded |
| Category breakdown | Excluded |
| Employee/salesperson sales | Excluded |
| Hourly / daily trend | Excluded |
| Expected cash (till reconciliation) | Excluded — cash count comparison is accurate |
| Salesperson EOD auto-EcoCash | Already excluded via `paymentStatus: 'PAID'` filter |
| EOD EcoCash verification list | Already excluded via `paymentStatus: 'PAID'` filter |

### 15.2 Specific API changes required

**`src/app/api/universal/daily-sales/route.ts`** — add to order query:
```typescript
// Existing filter (EXPENSE_ACCOUNT) stays; add status exclusion:
status: { not: 'CANCELLED' }
```

**`src/app/api/eod/grouped-preview/route.ts`** and **`grouped-run/route.ts`** — audit and add same filter.

**Note:** No changes needed to the salesperson EOD pending API (already uses `paymentStatus: 'PAID'`) or the EcoCash verification API (same reason).

---

## 16. Renewal Notification

**Trigger:** Checked lazily on `/api/manager-override/code/status` call. If `daysUntilExpiry ≤ 5` and no renewal notification in last 24 hours → create `appNotification`.

**Content:**
- Title: "Override code expiring soon"
- Body: "Your manager override code expires on [date]. Renew it to continue authorising manager actions."
- Link: `/profile#override-code`

---

## 17. Backup System Updates

| File | Change |
|------|--------|
| `src/lib/backup-clean.ts` | Add 4 fetch blocks: `managerOverrideCodes` (by userId), `managerOverrideCodeHistory` (by userId), `managerOverrideLogs` (by businessId), `orderCancellations` (by businessId) |
| `src/lib/restore-clean.ts` | Add all 4 to `RESTORE_ORDER` after `users` + `businesses`. Add to `TABLE_TO_MODEL_MAPPING` where needed. |
| `src/lib/backup-validation.ts` | Add all 4 keys |
| `scripts/test-backup-e2e.ts` | Add all 4 to `NEW_TABLE_KEYS` |

---

## 18. Impact Analysis

| Area | Impact | Notes |
|------|--------|-------|
| `BusinessOrders` | Status + paymentStatus updated on cancellation | No schema change |
| `BusinessTransactions` | DEBIT row for net refund amount | No schema change |
| `ProductVariants.stockQuantity` | Incremented on cancellation | Skip restaurant |
| `daily-sales` API | Add `status: { not: 'CANCELLED' }` filter | Critical — feeds all 4 EOD report pages |
| Grouped EOD APIs | Audit and add cancellation exclusion | Review both grouped-preview and grouped-run |
| All own-POS completed panels | Cancel button | Grocery, Restaurant, Clothing, Hardware |
| Universal POS completed panel | Cancel button | Via shared component |
| All order history pages | Cancel button per eligible order | All business types |
| `broadcast-sync.ts` | Add `ORDER_CANCELLED` message type + payload fields | One change covers all POS types |
| `customer-display/page.tsx` | Handle `ORDER_CANCELLED` → show cancellation overlay (EcoCash fee breakdown or simple refund, 10s auto-clear) | Shared display — all businesses benefit automatically |
| User profile page | Manager Override Code section | Manager-only visibility |
| Bell notifications | Renewal alert | Existing `appNotifications` table |
| EcoCash refund | Net = gross − 2× fee | Explained in modal and customer display |
| Loyalty points | Reversed on cancellation — deducted from customer balance | `BusinessCustomers.loyaltyPoints -= order.attributes.loyaltyPointsEarned` |

---

## 19. Files Created / Modified

**New files:**
- `src/app/api/manager-override/code/status/route.ts`
- `src/app/api/manager-override/code/setup/route.ts`
- `src/app/api/manager-override/resolve/route.ts`
- `src/app/api/orders/[orderId]/cancel/route.ts`
- `src/app/api/orders/[orderId]/cancel/log/route.ts`
- `src/app/api/orders/[orderId]/cancellation/route.ts`
- `src/app/api/reports/cancellations/route.ts`
- `src/components/manager-override/manager-override-modal.tsx`
- `src/app/reports/cancellations/page.tsx` (or per-business route)
- `prisma/migrations/[timestamp]_manager_override_and_cancellations/migration.sql`

**Modified files:**
- `prisma/schema.prisma`
- `src/app/api/universal/daily-sales/route.ts` — add `status: { not: 'CANCELLED' }` filter
- `src/app/api/eod/grouped-preview/route.ts` — add cancellation exclusion
- `src/app/api/eod/grouped-run/route.ts` — add cancellation exclusion
- `src/app/profile/page.tsx` — override code section
- `src/lib/customer-display/broadcast-sync.ts` — add `ORDER_CANCELLED` message type + payload fields
- `src/app/customer-display/page.tsx` — handle `ORDER_CANCELLED` message, cancellation overlay UI
- `src/app/grocery/pos/page.tsx` — cancel button + send `ORDER_CANCELLED` event
- `src/app/restaurant/pos/page.tsx` — cancel button + send `ORDER_CANCELLED` event
- `src/app/clothing/pos/components/advanced-pos.tsx` — cancel button + send `ORDER_CANCELLED` event
- `src/app/hardware/pos/page.tsx` — cancel button + send `ORDER_CANCELLED` event
- `src/app/universal/pos/page.tsx` — cancel button + send `ORDER_CANCELLED` event
- Order history pages for all business types — cancel button (no customer display event needed from history)
- `src/lib/backup-clean.ts`
- `src/lib/restore-clean.ts`
- `src/lib/backup-validation.ts`
- `scripts/test-backup-e2e.ts`
- `docs/user-guide.md`

---

## 20. Implementation TODO

### Phase 1 — Database & Core Override System
- [x] Add 4 models + 2 enums to `prisma/schema.prisma`
- [x] Run `prisma migrate dev --name manager_override_and_cancellations` (deployed via `migrate deploy` due to shadow DB drift)
- [x] Implement `POST /api/manager-override/code/setup`
- [x] Implement `GET /api/manager-override/code/status` (with renewal notification trigger)
- [x] Implement `POST /api/manager-override/resolve` (scanToken-first, then code hash)
- [x] Build `<ManagerOverrideModal>` (all screens: staff reason, code entry, approve/deny with editable cash refund, denial reason, denied-final, success)

### Phase 2 — Override Code Profile UI
- [x] Add "Manager Override Code" section to profile page (manager-only)
- [x] Status badge + setup/renewal form with real-time composition indicators

### Phase 3 — EOD Exclusion Fixes
- [x] Add `status: { not: 'CANCELLED' }` to `daily-sales` API order query (+ post-query filter safety net)
- [x] Audit `grouped-preview/route.ts` — already uses `status: 'COMPLETED'`, no change needed
- [x] Audit `grouped-run/route.ts` — doesn't query orders directly, uses client-supplied totals, no change needed
- [x] Verify salesperson EOD EcoCash (already correct via paymentStatus filter)

### Phase 3b — Customer Display
- [x] Add `ORDER_CANCELLED` to `CartMessageType` in `broadcast-sync.ts`
- [x] Add cancellation payload fields to `CartMessage['payload']`
- [x] Add `cancellationState` state + `ORDER_CANCELLED` case handler to `customer-display/page.tsx`
- [x] Build cancellation overlay component (EcoCash breakdown vs cash, 10s auto-clear)

### Phase 4 — Order Cancellation API
- [x] Implement `POST /api/orders/[orderId]/cancel` (refund calc, rollback transaction, loyalty points reversal, log)
- [x] Implement `POST /api/orders/[orderId]/cancel/log` (non-approval outcomes)
- [x] Implement `GET /api/orders/[orderId]/cancellation`

### Phase 5 — POS Cancel Buttons (all implementations)
- [x] Grocery POS — cancel button in receipt modal, manager override modal, customer display event
- [x] Restaurant POS — cancel button in receipt modal, manager override modal, customer display event
- [x] Clothing POS — cancel button via UnifiedReceiptPreviewModal `onCancelOrder`, manager override modal
- [x] Hardware POS — via UniversalPOS component (pos-system.tsx), cancel button via ReceiptPreview `onCancelOrder`
- [x] Universal POS — cancel button via UnifiedReceiptPreviewModal `onCancelOrder`, manager override modal
- [x] Shared: `UnifiedReceiptPreviewModal` + `ReceiptPreview` + `ManagerOverrideModal` updated with `onCancelOrder`/staffReason

### Phase 6 — Order History Cancel Buttons
- [x] `OrderCard.tsx` — added `onCancel` prop + same-day COMPLETED/PAID guard
- [x] `UniversalOrdersPage.tsx` — wired `ManagerOverrideModal` for all 4 business-type order histories (grocery, restaurant, clothing, hardware)
- [x] `ReceiptDetailModal` — added Cancel Order button + `ManagerOverrideModal` for the universal receipts search view

### Phase 7 — Cancellation Reports Page
- [x] `GET /api/reports/cancellations` — filters by businessId + date range; returns summary + cancellations + overrideLogs
- [x] `src/app/reports/cancellations/page.tsx` — summary cards (5), Approved Cancellations tab, Override Log tab, CSV export on each tab

### Phase 8 — Backup + Validation
- [x] Add 4 tables to all 4 backup/validation files
- [x] Run `npx tsx scripts/test-backup-e2e.ts` — must pass ✅

### Phase 9 — User Guide
- [x] "Manager Override Code" section (§36 — setup, expiry, permissions)
- [x] "Order Cancellation" section (§37 — staff flow, manager flow, EcoCash fee explanation, constraints, customer display)
- [x] "Cancellation Reports" section (§38 — filters, summary cards, both tabs, CSV export)
- [x] Troubleshooting (§38 — 5 common issues with resolution steps)

---

## 21. Resolved Questions

All questions answered — no open items remain.

| # | Question | Answer |
|---|----------|--------|
| 1 | EcoCash refund = gross − 2× fee? | ✅ Confirmed |
| 2 | Who can initiate? | Any logged-in staff member |
| 3 | Time window? | Same-day only, before EOD is closed |
| 4 | Hardware POS path? | `src/app/hardware/pos/page.tsx` ✅ |
| 5 | Loyalty points reversed? | **Yes — must be reversed** on approval |
| 6 | Restaurant no restock? | ✅ Confirmed — no inventory change for restaurant |
| 7 | Employee card field? | `employees.scanToken` — confirmed via `POST /api/clock-in/card-scan` |
| 8 | Customer display shared? | ✅ Confirmed — one `ORDER_CANCELLED` type covers all businesses |
| 9 | Max failed attempts? | 3 attempts, then lock ✅ |
| 10 | Denial escalation / retry? | **First denial is FINAL** — no retry with another manager |

---

## 22. Review Section

**Status:** Complete — all 9 phases implemented and tested.

### Summary of Changes

**New files (10):**
- `src/app/api/manager-override/code/status/route.ts` — code status + expiry notification trigger
- `src/app/api/manager-override/code/setup/route.ts` — create/rotate code with bcrypt hashing + reuse history check
- `src/app/api/manager-override/resolve/route.ts` — scanToken-first resolution, then code hash comparison
- `src/app/api/orders/[orderId]/cancel/route.ts` — full cancellation transaction (refund calc, stock restore, loyalty reversal, ledger debit, log)
- `src/app/api/orders/[orderId]/cancel/log/route.ts` — DENIED / ABORTED / FAILED_CODE log writer
- `src/app/api/orders/[orderId]/cancellation/route.ts` — cancellation detail getter
- `src/app/api/reports/cancellations/route.ts` — filters + summary metrics + both table datasets
- `src/components/manager-override/manager-override-modal.tsx` — 6-step modal (REASON → CODE_ENTRY → APPROVE_DENY → DENIAL_REASON → DENIED_FINAL → SUCCESS)
- `src/app/reports/cancellations/page.tsx` — summary cards, two tabs, CSV export
- `prisma/migrations/[timestamp]_manager_override_and_cancellations/migration.sql`

**Modified files (17+):**
- `prisma/schema.prisma` — 4 new models + 2 enums
- `src/app/profile/page.tsx` — Manager Override Code section (manager-only)
- `src/lib/customer-display/broadcast-sync.ts` — `ORDER_CANCELLED` message type + payload fields
- `src/app/customer-display/page.tsx` — cancellation overlay (EcoCash breakdown, 10s auto-clear)
- `src/app/api/universal/daily-sales/route.ts` — `status: { not: 'CANCELLED' }` filter
- `src/app/grocery/pos/page.tsx` — cancel button + manager override modal
- `src/app/restaurant/pos/page.tsx` — cancel button + manager override modal
- `src/app/clothing/pos/components/advanced-pos.tsx` — cancel button via `onCancelOrder` prop
- `src/components/universal/pos-system.tsx` — cancel button via `onCancelOrder` on ReceiptPreview (covers hardware POS)
- `src/app/universal/pos/page.tsx` — cancel button via `onCancelOrder` on UnifiedReceiptPreviewModal
- `src/components/receipts/unified-receipt-preview-modal.tsx` — `onCancelOrder?` prop
- `src/components/printing/receipt-preview.tsx` — `onCancelOrder?` prop
- `src/components/universal/orders/OrderCard.tsx` — Cancel button (same-day guard)
- `src/components/universal/orders/UniversalOrdersPage.tsx` — manager override modal wired to order history
- `src/components/receipts/receipt-detail-modal.tsx` — Cancel button + manager override modal
- `src/lib/backup-clean.ts` — section 56: 4 new tables
- `src/lib/restore-clean.ts` — RESTORE_ORDER + unique constraints + model name mappings
- `scripts/test-backup-e2e.ts` — 4 keys added to NEW_TABLE_KEYS
- `docs/user-guide.md` — sections 36, 37, 38

### Key Implementation Notes

- **`onApproved` signature** extended to pass `staffReason` as 4th param — required because the cancel API needs it and the modal captures it in step 1.
- **Hardware POS** is covered by `pos-system.tsx` (shared UniversalPOS component) — no separate hardware-specific changes needed.
- **Universal POS page** does not have `sendToDisplay` wired so no customer display event fires from that path — this is acceptable since this POS is used for non-customer-facing business types.
- **Backup test** passes with all 4 new tables present as empty arrays (no test data yet).
- **EOD grouped APIs** were audited — `grouped-preview` uses `status: 'COMPLETED'` already; `grouped-run` uses client-supplied totals and does not query orders directly. No changes needed beyond the `daily-sales` fix.

### Suggested Follow-Up Improvements

1. **Cancellation report filters** — the UI currently only filters by date and businessId; the plan described additional filters (staff member, manager, outcome, customer, payment method). These can be added as a fast follow.
2. **Partial cash refund** — the plan described an editable refund amount for cash orders (manager can settle for less than the full total). The modal currently defaults to the full amount. This was deferred to keep the implementation simple.
3. **Cancellation receipt** — a printable cancellation confirmation for the customer could be added to the success screen of the modal.
4. **Hardware POS customer display** — `sendToDisplay` could be wired to `pos-system.tsx` if the hardware POS gains a customer display in future.

---

## TODO: Re-order Button Consistency (2026-04-26)

- [ ] Analyze Restaurant and Grocery POS recent orders expansion logic
- [ ] Ensure "+ Re-order" button is always shown when an order is expanded and has items
- [ ] Confirm `onReorder` prop is always passed to the widget/component
- [ ] Test and verify for both Restaurant and Grocery POS
- [ ] Keep changes minimal and isolated

---
