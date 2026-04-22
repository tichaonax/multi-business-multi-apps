# MBM-184 — Restaurant Delivery Service

**Date:** 2026-04-21  
**Status:** AWAITING APPROVAL  
**Business:** HXI Eats (restaurant)

---

## Overview

Introduce a phone-in delivery order workflow for the restaurant. Deliveries run daily 12:00 PM – 2:00 PM. Customers call in, a cashier creates the order, links the customer, and the system prints two receipts automatically (kitchen copy + customer copy). Orders may be prepaid from a customer credit account or paid on delivery. A blacklist prevents blocked customers from placing delivery orders. Each order receipt carries a barcode for fast status scanning. A named driver is assigned to each delivery run with vehicle and odometer tracking integrated with the vehicle management system.

---

## Business Rules

| Rule | Detail |
|------|--------|
| Delivery window | 12:00 PM – 2:00 PM daily (informational only) |
| Order outside window | Warning shown to cashier — delivery may incur fee or require approval. Order is NOT blocked. |
| Order type flag | `delivery` (distinct from `dine-in` and `takeaway`) |
| Two receipts | Kitchen copy (items only) + Customer copy (full receipt with barcode + note) |
| Delivery note | Optional per-order — address or special instructions. Editable before or after sale completion. |
| Prepaid credit | Auto-deduct available credit. Receipt shows amount deducted, balance due (may be $0), remaining credit balance. |
| Partial credit | Deduct whatever credit is available; remainder is pay-on-delivery. |
| Pay on delivery | If no credit → receipt shows "Payment due on delivery." |
| Credit top-up | Management can add credit to any customer account at any time. |
| Blacklist | Management bans a customer. System blocks delivery order when banned customer is selected. Management can lift ban later. |
| No refund after prep | If order is cancelled after kitchen has started preparation, credit is NOT restored. Management must manually decide. |
| Barcode on receipt | Every customer delivery receipt prints a unique barcode (order ID encoded). Scanning on any screen triggers delivery status UI. |
| Driver | Named driver registered in vehicle management system. Must record odometer before and after each delivery run. |
| Vehicle | Driver's vehicle must be linked at dispatch time. Odometer data stored and linkable to vehicle management system. |
| Driver printout | Optional single long receipt-printer printout listing all deliveries for the run. Driver uses it as a physical checklist. |
| Status workflow | Pending → Ready → Dispatched → Delivered. Cashiers and management can update. Driver can update Dispatched/Delivered. |

---

## Scope of Work

### Phase 1 — Database (Schema + Migration)

- [x] **1.1** Add `DeliveryCustomerAccounts` table
  - `id`, `customerId` (FK → Customers, unique), `businessId`, `balance` (Decimal), `isBlacklisted` (Boolean, default false), `blacklistReason` (String?), `blacklistedAt` (DateTime?), `blacklistedBy` (String?), `createdAt`, `updatedAt`

- [x] **1.2** Add `DeliveryAccountTransactions` table — credit ledger
  - `id`, `accountId` (FK → DeliveryCustomerAccounts), `type` (`CREDIT` | `DEBIT`), `amount` (Decimal), `orderId` (String?), `notes` (String?), `createdBy` (String), `createdAt`

- [x] **1.3** Add `DeliveryOrderMeta` table — per-order delivery metadata
  - `id`, `orderId` (FK → Orders, unique), `deliveryNote` (String?), `creditUsed` (Decimal, default 0), `creditBalance` (Decimal — snapshot of remaining credit at time of order), `paymentMode` (`PREPAID` | `PARTIAL` | `ON_DELIVERY`), `status` (`PENDING` | `READY` | `DISPATCHED` | `DELIVERED` | `CANCELLED`), `runId` (FK → DeliveryRuns?), `createdAt`, `updatedAt`

- [x] **1.4** Add `DeliveryRuns` table — one record per driver dispatch event
  - `id`, `businessId`, `driverId` (FK → Employees), `vehicleId` (String — vehicle management system reference), `vehiclePlate` (String), `odometerStart` (Decimal?), `odometerEnd` (Decimal?), `runDate` (DateTime), `dispatchedAt` (DateTime?), `completedAt` (DateTime?), `notes` (String?), `createdBy` (String), `createdAt`, `updatedAt`

- [x] **1.5** Migration `20260421000001_add_delivery_service` created and deployed successfully

### Phase 2 — Backend APIs

- [x] **2.1** `POST /api/restaurant/delivery/accounts` — create or top up customer delivery credit account (management only)
- [x] **2.2** `GET /api/restaurant/delivery/accounts/[customerId]` — balance, blacklist status, full transaction history
- [x] **2.3** `PATCH /api/restaurant/delivery/accounts/[customerId]/blacklist` — ban or unban (management only, reason required for ban)
- [x] **2.4** `POST /api/restaurant/delivery/orders` — create delivery order
  - Validates customer is not blacklisted (hard block)
  - Checks current time against 12–2 PM window; if outside → attaches warning flag (not a block)
  - Deducts available credit; computes remainder
  - Sets `paymentMode` (`PREPAID` / `PARTIAL` / `ON_DELIVERY`)
  - Records credit snapshot in `DeliveryOrderMeta`
  - Creates `DeliveryAccountTransactions` debit record
  - Returns order + credit deduction summary for receipt generation
- [x] **2.5** `PATCH /api/restaurant/delivery/orders/[orderId]/note` — update delivery note post-sale
- [x] **2.6** `PATCH /api/restaurant/delivery/orders/[orderId]/status` — update order status (with role checks)
  - If cancelling and order is READY/DISPATCHED/DELIVERED → do NOT restore credit automatically; flag for management review
  - If cancelling PENDING order → restore credit automatically
- [x] **2.7** `GET /api/restaurant/delivery/orders` — list delivery orders with filters (date, status, customer, runId)
- [x] **2.8** `POST /api/restaurant/delivery/runs` — create a new delivery run (assign driver + vehicle)
- [x] **2.9** `PATCH /api/restaurant/delivery/runs/[runId]` — update run (odometer readings, assign orders, mark complete)
- [x] **2.10** `GET /api/restaurant/delivery/runs` — list runs by date
- [x] **2.11** `GET /api/restaurant/delivery/reports` — delivery sales, credit usage, blacklist log, run summary
- [x] **2.12** `GET /api/restaurant/delivery/orders/[orderId]/barcode-lookup` — resolve order from barcode scan, return status + meta
- [x] **2.13** Extend `GET /api/restaurant/daily-sales` — include `deliveryPrepayments` in the response:
  - Sum all `DeliveryAccountTransactions` where `type = 'CREDIT'` and `createdAt` falls within today's business day for the business
  - Return as `deliveryPrepayments: { cashTotal, count }` alongside existing `paymentMethods` and `expenseAccountSales`

### Phase 3 — Receipt Templates

- [x] **3.1** **Kitchen receipt** — "KITCHEN COPY — DELIVERY" header, order number, customer name, items + quantities (no prices), delivery note, timestamp
- [x] **3.2** **Customer receipt** — standard receipt + delivery note section + credit/payment section:
  - Credit used: $X.XX
  - Balance due: $X.XX (or $0.00 if fully prepaid)
  - Remaining credit: $X.XX
  - If on delivery: "Payment due on delivery"
  - **Barcode at bottom** encoding the order ID (Code 128 or QR code) — used for status scanning
- [x] **3.3** Auto-print both receipts immediately on delivery order save (no manual trigger)
- [x] **3.4** Reprint either receipt from the order detail view
- [x] **3.5** **Driver dispatch printout** — single long receipt-printer format listing all orders in the run:
  - Header: Run date, driver name, vehicle + plate, odometer start
  - One row per order: order number, customer name, address/note, amount due, □ checkbox
  - Footer: total orders, total cash to collect
  - Triggered by "Print Run Sheet" button on the delivery management page

### Phase 4 — Global Barcode Scan Integration (Any Screen)

- [x] **4.1** Extend the existing `global-barcode-modal.tsx` scan pipeline to detect delivery order barcodes
  - Delivery order barcodes encode a prefix, e.g. `DEL-{orderId}`
  - After employee check and before product lookup — if scanned code matches `DEL-` prefix → intercept and open Delivery Status Modal
- [x] **4.2** **Delivery Status Modal** (shown on any screen after scan)
  - Displays: order number, customer name, items summary, current status, delivery note
  - Action buttons based on current status: mark Ready / Dispatched / Delivered / flag issue
  - Requires no navigation — works from POS, reports, or any page
- [x] **4.3** Manual status update also available from delivery queue and order detail pages

### Phase 5 — POS / Order Entry UI

- [x] **5.1** Add "Delivery" order type toggle in the restaurant POS (alongside Dine-In / Takeaway)
- [x] **5.2** When Delivery is selected — mandatory customer selection before checkout
- [x] **5.3** Show customer delivery credit balance + blacklist badge in customer panel
- [x] **5.4** Hard block: if customer is blacklisted → cannot complete delivery order; show reason
- [x] **5.5** Soft warning: if current time is outside 12–2 PM window → banner "Outside delivery hours — fee or approval may apply"
- [x] **5.6** Delivery note field on order form (optional, multiline, persists on order)
- [x] **5.7** At checkout, show credit deduction preview: "Credit: -$X.XX | Due on delivery: $X.XX"

### Phase 6 — Customer Account Management UI

- [x] **6.1** `/restaurant/delivery/accounts` page — customer search, balance, full transaction history (top-ups and deductions)
- [x] **6.2** "Add Credit" modal (management only) — amount, notes; creates `CREDIT` transaction
- [x] **6.3** "Blacklist" / "Remove from Blacklist" button (management only) — reason required to ban
- [x] **6.4** Blacklisted customer badge on customer search results in POS and delivery queue

### Phase 7 — Delivery Management Page (`/restaurant/delivery`)

- [x] **7.1** Daily delivery queue view — all orders for today, grouped by status
- [x] **7.2** Status columns: Pending | Ready | Dispatched | Delivered
- [x] **7.3** Status update buttons per order (cashier + management)
- [x] **7.4** "Create Run" workflow: select driver (from employees), vehicle (from vehicle management or manual plate), odometer start, assign orders, dispatch → prints run sheet
- [x] **7.5** On run completion: enter odometer end; saves to `DeliveryRuns`
- [x] **7.6** "Print Kitchen Batch" button — prints kitchen copies for all PENDING orders
- [x] **7.7** Filter by date to view past runs and historical orders
- [x] **7.8** Vehicle `id` stored in `DeliveryRuns.vehicleId` — vehicle management can query via `GET /api/restaurant/delivery/runs?vehicleId=X`

### Phase 8 — Driver Access

- [x] **8.1** Driver role can see the delivery management page (read + status update only)
- [x] **8.2** Driver can scan barcodes to update order status (via global scan integration)
- [x] **8.3** Driver can enter odometer start/end for their own runs
- [x] **8.4** Driver cannot create orders, manage credit, or blacklist customers

### Phase 9 — Reports

- [x] **9.1** **Delivery Sales Report** — by date range: orders, revenue, credit used, cash to collect, delivery volume
- [x] **9.2** **Customer Credit Report** — per customer: top-up history, deduction history, current balance
- [x] **9.3** **Blacklist Report** — all bans: customer, reason, banned by, date, lifted date, lifted by
- [x] **9.4** **Driver Run Report** — per run: driver, vehicle, date, odometer start/end, distance, orders delivered, cash collected
- [x] **9.5** Vehicle management integration hook: `GET /api/restaurant/delivery/runs?vehicleId=X` returns odometer data per run for a given vehicle

### Phase 10 — Permissions

#### New permission keys to add to `RestaurantPermissions` interface

| Permission Key | Purpose |
|----------------|---------|
| `canViewDeliveryQueue` | See the delivery management page and daily order queue |
| `canCreateDeliveryOrders` | Place delivery orders at the POS |
| `canUpdateDeliveryStatus` | Change order status (Ready / Dispatched / Delivered) |
| `canManageDeliveryRuns` | Create runs, assign driver + vehicle, enter odometer, print run sheet |
| `canManageDeliveryCredit` | Top up customer delivery credit accounts |
| `canManageDeliveryBlacklist` | Ban or unban customers from delivery |
| `canViewDeliveryReports` | Access delivery sales, credit, blacklist, and driver run reports |
| `canPrintDeliveryMarketing` | Access the flyer and business card printable page |
| `canUpdateOdometer` | Enter odometer start/end on assigned delivery runs (driver only) |

#### Role matrix

| Permission | business-owner | business-manager | employee (cashier) | delivery-driver |
|------------|:-:|:-:|:-:|:-:|
| `canViewDeliveryQueue` | ✅ | ✅ | ✅ | ✅ |
| `canCreateDeliveryOrders` | ✅ | ✅ | ✅ | ❌ |
| `canUpdateDeliveryStatus` | ✅ | ✅ | ✅ | ✅ (own run only) |
| `canManageDeliveryRuns` | ✅ | ✅ | ❌ | ❌ |
| `canManageDeliveryCredit` | ✅ | ✅ | ❌ | ❌ |
| `canManageDeliveryBlacklist` | ✅ | ✅ | ❌ | ❌ |
| `canViewDeliveryReports` | ✅ | ✅ | ❌ | ❌ |
| `canPrintDeliveryMarketing` | ✅ | ✅ | ❌ | ❌ |
| `canUpdateOdometer` | ✅ | ✅ | ❌ | ✅ |

#### Driver access — screens visible

The delivery driver role (`delivery-driver`) is a new business membership role. Drivers only see:

| Screen | Path | Access level |
|--------|------|-------------|
| Delivery queue | `/restaurant/delivery` | View orders in their assigned run; update status; enter odometer |
| Barcode scan (global) | Any screen | Scan order barcodes to update delivery status |
| Nothing else | — | All other restaurant screens hidden |

Drivers do NOT see: POS, reports, customer accounts, menu, inventory, marketing, or financial screens.

#### Implementation tasks

- [x] **10.1** Add 9 new permission keys to `RestaurantPermissions` interface in `src/types/permissions.ts`
- [x] **10.2** Set permissions in `RESTAURANT_EMPLOYEE_PERMISSIONS` — grant `canViewDeliveryQueue`, `canCreateDeliveryOrders`, `canUpdateDeliveryStatus`
- [x] **10.3** Set permissions in `RESTAURANT_MANAGER_PERMISSIONS` — grant all delivery permissions except `canUpdateOdometer`
- [x] **10.4** Set permissions in `RESTAURANT_OWNER_PERMISSIONS` — grant all delivery permissions
- [x] **10.5** Add `delivery-driver` as a new role preset in `RESTAURANT_PERMISSION_PRESETS` — grant only `canViewDeliveryQueue`, `canUpdateDeliveryStatus`, `canUpdateOdometer`, `canAccessGlobalBarcodeScanning`
- [x] **10.6** Gate all delivery API routes with permission checks:
  - `canCreateDeliveryOrders` → POST orders
  - `canManageDeliveryCredit` → POST/PATCH accounts
  - `canManageDeliveryBlacklist` → PATCH blacklist
  - `canManageDeliveryRuns` → POST/PATCH runs
  - `canViewDeliveryReports` → GET reports
  - `canUpdateOdometer` → PATCH run odometer fields
- [x] **10.7** Gate delivery management page — redirect if user lacks `canViewDeliveryQueue`
- [x] **10.8** Hide "Add Credit", "Blacklist", "Create Run", and reports links from cashiers and drivers using permission checks in the UI

---

### Phase 11 — Marketing Materials (In-App Printable)

- [x] **11.1** `/restaurant/delivery/marketing` page — two printable templates (gated behind `canPrintDeliveryMarketing`)
- [x] **11.2** **A5 Flyer** — featured meals section (pulled from active menu), delivery hours (12–2 PM), restaurant name, phone number. Print-ready layout with restaurant branding.
- [x] **11.3** **Business Card** (3.5×2 in, 4-up on A4 for cutting) — "Order by phone & get it delivered", hours, phone number, restaurant name. Simple, bold layout.
- [x] **11.4** Both use `window.print()` with print-only CSS to strip navigation and render cleanly

---

### Phase 12 — EOD Integration

The EOD cash reconciliation must include delivery prepayments received that day, since the cashier collects cash when topping up a customer account. That cash sits in the till and must be accounted for.

**How it works today:**
```
expectedCash = CASH sales total + meal program cash collected
```

**After this change:**
```
expectedCash = CASH sales total + meal program cash collected + delivery prepayments cash
```

- [x] **12.1** Update `src/app/restaurant/reports/end-of-day/page.tsx`:
  - Read `dailySales.deliveryPrepayments?.cashTotal || 0` from the daily-sales API response
  - Add it to `expectedCash` calculation (line ~296)
  - Show it as a separate line item in the cash reconciliation section: **"Delivery Prepayments: $X.XX"** between meal program and the total, so the cashier can see exactly what contributes to the expected cash
- [x] **12.2** The delivery prepayments line is only shown when `deliveryPrepayments.cashTotal > 0` to keep the EOD clean on days with no top-ups
- [x] **12.3** Include `deliveryPrepayments` in the saved EOD report data so historical reports are accurate

> **Note:** Only cash top-ups count here. If we later support EcoCash top-ups for delivery credit, those would be handled separately (same as EcoCash sales are tracked separately today). For now, all credit top-ups are assumed cash.

---

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Credit storage | Separate `DeliveryCustomerAccounts` table | Isolated from general expense accounts; delivery-specific rules |
| Partial credit | Deduct available, mark rest as ON_DELIVERY | User confirmed — no full-credit requirement |
| Credit on cancel | Auto-restore only for PENDING; manual for prepared orders | Matches stated rule — no refund after preparation |
| Cutoff time | Informational warning only, not a block | User confirmed — cashier judgment call |
| Barcode format | `DEL-{orderId}` prefix, Code 128 | Distinguishable from product/customer barcodes; works with existing scanner pipeline |
| Global scan routing | Extend `global-barcode-modal.tsx` step 2 | Consistent with existing barcode routing pattern (employee → delivery check → customer → product) |
| Driver dispatch | Named driver + vehicle + odometer per `DeliveryRuns` record | Enables vehicle management integration without rework |
| Vehicle management integration | Store `vehicleId` reference now; expose read API | Avoids rework later; vehicle management system can pull data by vehicleId |
| Driver printout | Long receipt-printer format | Matches existing receipt printer infrastructure; no extra hardware |
| Status flow | Pending → Ready → Dispatched → Delivered | Clear operational stages; scanning shortcut for field use |
| Marketing | In-app printable page with `window.print()` | No external tools needed; always current with live menu data |

---

## Database Schema (Prisma)

```prisma
model DeliveryCustomerAccounts {
  id              String    @id @default(cuid())
  customerId      String    @unique
  businessId      String
  balance         Decimal   @default(0) @db.Decimal(10, 2)
  isBlacklisted   Boolean   @default(false)
  blacklistReason String?
  blacklistedAt   DateTime?
  blacklistedBy   String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  customer     Customers                    @relation(fields: [customerId], references: [id])
  business     Business                     @relation(fields: [businessId], references: [id])
  transactions DeliveryAccountTransactions[]

  @@map("delivery_customer_accounts")
}

model DeliveryAccountTransactions {
  id        String   @id @default(cuid())
  accountId String
  type      String   // CREDIT | DEBIT
  amount    Decimal  @db.Decimal(10, 2)
  orderId   String?
  notes     String?
  createdBy String
  createdAt DateTime @default(now())

  account DeliveryCustomerAccounts @relation(fields: [accountId], references: [id])

  @@map("delivery_account_transactions")
}

model DeliveryOrderMeta {
  id             String   @id @default(cuid())
  orderId        String   @unique
  deliveryNote   String?
  creditUsed     Decimal  @default(0) @db.Decimal(10, 2)
  creditBalance  Decimal  @default(0) @db.Decimal(10, 2)
  paymentMode    String   @default("ON_DELIVERY") // PREPAID | PARTIAL | ON_DELIVERY
  status         String   @default("PENDING")     // PENDING | READY | DISPATCHED | DELIVERED | CANCELLED
  runId          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  run DeliveryRuns? @relation(fields: [runId], references: [id])

  @@map("delivery_order_meta")
}

model DeliveryRuns {
  id            String    @id @default(cuid())
  businessId    String
  driverId      String
  vehicleId     String?
  vehiclePlate  String?
  odometerStart Decimal?  @db.Decimal(10, 1)
  odometerEnd   Decimal?  @db.Decimal(10, 1)
  runDate       DateTime
  dispatchedAt  DateTime?
  completedAt   DateTime?
  notes         String?
  createdBy     String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  business Business         @relation(fields: [businessId], references: [id])
  orders   DeliveryOrderMeta[]

  @@map("delivery_runs")
}
```

---

## Files Likely to Change

| File | Change |
|------|--------|
| `prisma/schema.prisma` | 4 new models |
| `prisma/migrations/` | New migration file |
| `src/types/permissions.ts` | 9 new keys in `RestaurantPermissions`; new `delivery-driver` preset |
| `src/app/api/restaurant/delivery/*` | 12 new API routes |
| `src/app/restaurant/pos/page.tsx` | Delivery toggle, customer linking, credit preview |
| `src/app/restaurant/delivery/page.tsx` | New delivery management page |
| `src/app/restaurant/delivery/marketing/page.tsx` | New printable marketing page |
| `src/app/restaurant/customers/[id]/page.tsx` | Delivery account tab |
| `src/lib/receipt-builder.ts` | Kitchen receipt, customer delivery receipt (with barcode), driver run sheet |
| `src/components/universal/global-barcode-modal.tsx` | DEL- prefix routing → Delivery Status Modal |
| `src/components/restaurant/delivery-status-modal.tsx` | New component — post-scan status UI |
| `src/components/reports/` | 4 delivery report components |
| `src/app/api/restaurant/daily-sales/route.ts` | Add `deliveryPrepayments` to response |
| `src/app/restaurant/reports/end-of-day/page.tsx` | Include prepayments in expectedCash + EOD line item |

---

## Review

*(To be completed after implementation)*
