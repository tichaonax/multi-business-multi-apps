# MBM-173: Eco-Cash to Cash Conversion

**Date:** 2026-04-06
**Status:** COMPLETED
**Priority:** High
**Related:** MBM-150 (Eco-Cash Payment Support), MBM-142 (Physical Cash Bucket)

---

## Objective

Introduce a controlled workflow that allows a business to convert its eco-cash wallet balance into physical cash. The requester hands the equivalent physical cash to the cashier; the system records both the outflow from the eco-cash wallet and the inflow to the cash bucket simultaneously. No net money leaves the system. A full audit trail is maintained so management can report on all conversions without affecting balance totals.

---

## Background & Business Rules

| Rule | Detail |
|------|--------|
| Net-zero | One OUTFLOW ECOCASH entry + one INFLOW CASH entry are created atomically, both using `tenderedAmount`. The eco-cash outflow always equals the cash inflow, so the total value in the system never changes. |
| Tendered amount captured at approval | When approving, the approver records the actual eco-cash amount that will be sent (`tenderedAmount`). This may be less than, equal to, or greater than the originally requested `amount`. |
| Variance handling | Whatever variance exists between `amount` and `tenderedAmount` (shortfall or surplus), the cashier must hand over exactly `tenderedAmount` in physical cash. Both ledger entries use `tenderedAmount` so the exchange is always exact and net-zero. |
| Balance check | The eco-cash wallet balance must be ≥ `tenderedAmount` at approval time |
| Not a payment | Conversion entries use a new `entryType = ECOCASH_CONVERSION` and are NOT treated as payments |
| Audit trail | Every state change (request → approve → complete / reject) is stamped with user + timestamp |
| Reversibility | A completed conversion cannot be reversed; a pending or approved request can be rejected (with reason) |
| Reporting | Conversions are queryable by date range, status, and amount for management reporting. Reports show both `amount` (requested) and `tenderedAmount` (actual) so shortfalls are visible. |

---

## Current State (relevant facts)

- `CashBucketEntry` is a ledger table; balances are always computed on-the-fly:
  - `ecocashBalance = Σ(INFLOW ECOCASH) − Σ(OUTFLOW ECOCASH)`
  - `cashBalance    = Σ(INFLOW CASH)    − Σ(OUTFLOW CASH)`
- `entryType` is a plain `String` field (no enum) — new values can be introduced without a column migration
- Existing `entryType` values: `EOD_RECEIPT`, `PAYMENT_APPROVAL`, `PETTY_CASH`, `CASH_ALLOCATION`, `PAYROLL_FUNDING`
- No existing model tracks eco-cash conversion requests

---

## Database Changes

### 1. New model: `EcocashConversion`  (table: `ecocash_conversions`)

```prisma
model EcocashConversion {
  id               String    @id @default(uuid())
  businessId       String
  amount           Decimal   @db.Decimal(12, 2)   // Requested amount
  tenderedAmount   Decimal?  @db.Decimal(12, 2) @map("tendered_amount")
  // Actual eco-cash amount confirmed by approver. May be less than, equal to,
  // or greater than amount. The cashier collects exactly this amount in cash.
  // Both ledger entries (OUTFLOW ECOCASH + INFLOW CASH) always use tenderedAmount.
  notes            String?

  status           String    @default("PENDING")
  // PENDING | APPROVED | COMPLETED | REJECTED

  requestedBy      String
  requestedAt      DateTime  @default(now())

  approvedBy       String?
  approvedAt       DateTime?

  completedBy      String?
  completedAt      DateTime?

  rejectedBy       String?
  rejectedAt       DateTime?
  rejectionReason  String?

  // Ledger entries created on completion
  outflowEntryId   String?   @unique @map("outflow_entry_id")
  inflowEntryId    String?   @unique @map("inflow_entry_id")

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  business    Businesses      @relation("BusinessEcocashConversions", fields: [businessId], references: [id])
  requester   Users           @relation("EcocashConversionRequester", fields: [requestedBy], references: [id])
  approver    Users?          @relation("EcocashConversionApprover", fields: [approvedBy], references: [id])
  completer   Users?          @relation("EcocashConversionCompleter", fields: [completedBy], references: [id])
  rejecter    Users?          @relation("EcocashConversionRejecter", fields: [rejectedBy], references: [id])

  @@index([businessId, status])
  @@index([businessId, requestedAt])
  @@map("ecocash_conversions")
}
```

### 2. New `entryType` value (no migration needed — `entryType` is a String)

A new value `ECOCASH_CONVERSION` will be added to the comment block in the schema and used in application code.

### 3. Back-relations to add on `Businesses` and `Users`

```prisma
// Businesses model (append):
ecocash_conversions  EcocashConversion[]  @relation("BusinessEcocashConversions")

// Users model (append):
ecocash_conversions_requested  EcocashConversion[]  @relation("EcocashConversionRequester")
ecocash_conversions_approved   EcocashConversion[]  @relation("EcocashConversionApprover")
ecocash_conversions_completed  EcocashConversion[]  @relation("EcocashConversionCompleter")
ecocash_conversions_rejected   EcocashConversion[]  @relation("EcocashConversionRejecter")
```

### 4. Migration file

New Prisma migration:  
`prisma/migrations/20260406000001_ecocash_conversion/migration.sql`

Creates `ecocash_conversions` table with all columns and indexes above, including the nullable `tendered_amount NUMERIC(12,2)` column set at approval time.

---

## Status Lifecycle

```
[PENDING] --approve--> [APPROVED] --complete (cash in hand)--> [COMPLETED]
    |                      |
    +----reject----------->+----reject-----------------------> [REJECTED]
```

| Action | Actor | Guard / Input |
|--------|-------|---------------|
| Create (PENDING) | Any authorised user | `amount` > 0 |
| Approve | Manager / Admin | Body must include `tenderedAmount` > 0; `ecocashBalance` ≥ `tenderedAmount` |
| Complete | Cashier / Manager | Status must be APPROVED; cashier confirms physical cash equal to `tenderedAmount` has been received |
| Reject | Manager / Admin | Allowed while PENDING or APPROVED; requires reason |

> **Variance examples:**
> - *Shortfall:* Request $500, wallet only has $350. Approver sets `tenderedAmount = 350`. Cashier collects $350 cash. Both ledger entries = $350.
> - *Surplus:* Request $300, approver decides to convert $400 instead. Sets `tenderedAmount = 400` (wallet must have ≥ $400). Cashier collects $400 cash. Both ledger entries = $400.
> - In all cases `tenderedAmount` is the single source of truth for the eco-cash outflow and cash inflow.

---

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/ecocash-conversions` | Create conversion request (status = PENDING) |
| `GET` | `/api/ecocash-conversions?businessId&status&startDate&endDate` | List conversions with filters |
| `GET` | `/api/ecocash-conversions/[id]` | Get single conversion with linked entries |
| `PATCH` | `/api/ecocash-conversions/[id]/approve` | Approve — requires `tenderedAmount` in body; validates ≤ `amount` and ≤ ecocash balance |
| `PATCH` | `/api/ecocash-conversions/[id]/complete` | Complete — creates two `CashBucketEntry` rows atomically using `tenderedAmount` |
| `PATCH` | `/api/ecocash-conversions/[id]/reject` | Reject with reason |

### Approve action (detailed)

```
PATCH /api/ecocash-conversions/[id]/approve
Body: { tenderedAmount: number }
```

Validations (400 if any fail):
1. `tenderedAmount` > 0
2. Current `ecocashBalance` ≥ `tenderedAmount`

Note: `tenderedAmount` may be less than, equal to, or greater than `conversion.amount`. No upper bound is enforced beyond the available wallet balance.

On success: sets `tenderedAmount`, `approvedBy`, `approvedAt`, `status = APPROVED`.

If `tenderedAmount` < `amount`, the shortfall (`amount − tenderedAmount`) is stored implicitly. The cashier is expected to collect exactly `tenderedAmount` in cash.

---

### Complete action (detailed)

```
PATCH /api/ecocash-conversions/[id]/complete
```

Runs as a single `prisma.$transaction`:

1. Re-check ecocash balance ≥ `tenderedAmount` (guard against race conditions between approve and complete)
2. Create `CashBucketEntry`:
   - `amount: tenderedAmount`, `entryType: ECOCASH_CONVERSION`, `direction: OUTFLOW`, `paymentChannel: ECOCASH`
   - `referenceType: ecocash_conversion`, `referenceId: conversionId`
3. Create `CashBucketEntry`:
   - `amount: tenderedAmount`, `entryType: ECOCASH_CONVERSION`, `direction: INFLOW`, `paymentChannel: CASH`
   - `referenceType: ecocash_conversion`, `referenceId: conversionId`
4. Update `EcocashConversion`:
   - `status: COMPLETED`, `completedBy`, `completedAt`, `outflowEntryId`, `inflowEntryId`

Net ledger effect: `ecocashBalance −= tenderedAmount`, `cashBalance += tenderedAmount` (always equal, always net-zero)

---

## UI Components

### Pages / Sections

| Component | Location | Description |
|-----------|----------|-------------|
| `EcocashConversionRequestForm` | Modal | Amount + notes input; submits POST |
| `EcocashConversionList` | Cash Bucket page | Table of conversions with status badges, filters |
| `EcocashConversionActions` | Row actions | Approve / Complete / Reject with confirmation dialogs |
| `EcocashConversionBadge` | Cash Bucket entry history | Shows `ECOCASH_CONVERSION` entries with linked conversion details |

### Cash Bucket summary impact

The existing balance summary is unaffected by design — the OUTFLOW ECOCASH and INFLOW CASH cancel at the aggregate level in the user's view of total value. However the page should:

- Show the conversion OUTFLOW in the eco-cash history
- Show the conversion INFLOW in the cash history
- Link both entries back to the parent conversion record

---

## Reporting

### New report endpoint

```
GET /api/reports/ecocash-conversions?businessId&startDate&endDate
```

Returns per-conversion rows:

```json
{
  "id": "...",
  "requestedAt": "...",
  "completedAt": "...",
  "amount": "500.00",
  "tenderedAmount": "350.00",
  "shortfall": "150.00",
  "status": "COMPLETED",
  "requestedBy": "John Doe",
  "approvedBy": "Manager",
  "completedBy": "Cashier",
  "notes": "..."
}
```

Summary totals:
- `totalRequested` — sum of `amount` for completed conversions in range
- `totalConverted` — sum of `tenderedAmount` for completed conversions in range (the actual eco-cash/cash exchanged)
- `totalVariance` — `totalConverted − totalRequested` (positive = net surplus, negative = net shortfall)
- `pendingCount` — count of PENDING
- `approvedCount` — count of APPROVED awaiting completion

---

## Files to Create / Modify

### New files

| File | Purpose |
|------|---------|
| `prisma/migrations/20260406000001_ecocash_conversion/migration.sql` | DB migration |
| `src/app/api/ecocash-conversions/route.ts` | POST (create) + GET (list) |
| `src/app/api/ecocash-conversions/[id]/route.ts` | GET single |
| `src/app/api/ecocash-conversions/[id]/approve/route.ts` | PATCH approve |
| `src/app/api/ecocash-conversions/[id]/complete/route.ts` | PATCH complete (atomic entries) |
| `src/app/api/ecocash-conversions/[id]/reject/route.ts` | PATCH reject |
| `src/app/api/reports/ecocash-conversions/route.ts` | GET report |
| `src/components/ecocash-conversion/EcocashConversionRequestForm.tsx` | Request form modal |
| `src/components/ecocash-conversion/EcocashConversionList.tsx` | Conversion table |
| `src/components/ecocash-conversion/EcocashConversionActions.tsx` | Action buttons |

### Modified files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `EcocashConversion` model + back-relations on `Businesses` and `Users` |
| `src/app/api/cash-bucket/route.ts` | Surface `ECOCASH_CONVERSION` entries in history; no balance formula change |
| Cash Bucket UI page | Add conversion list section + "Request Conversion" button |

---

## Todo List

- [x] 1. Add `EcocashConversion` model to `prisma/schema.prisma` + back-relations on `Businesses` & `Users`
- [x] 2. Create Prisma migration `20260406000001_ecocash_conversion`
- [x] 3. Run `prisma migrate deploy` and verify schema (used deploy instead of dev due to shadow DB issue)
- [x] 4. Create `POST/GET /api/ecocash-conversions` route
- [x] 5. Create `GET /api/ecocash-conversions/[id]` route
- [x] 6. Create `PATCH /api/ecocash-conversions/[id]/approve` route (requires `tenderedAmount` > 0; validates ecocashBalance ≥ `tenderedAmount`; no upper-bound constraint on `tenderedAmount` vs `amount`)
- [x] 7. Create `PATCH /api/ecocash-conversions/[id]/complete` route (atomic tx: OUTFLOW ECOCASH + INFLOW CASH, both using `tenderedAmount`)
- [x] 8. Create `PATCH /api/ecocash-conversions/[id]/reject` route
- [x] 9. Create `GET /api/reports/ecocash-conversions` report route
- [x] 10. Build `EcocashConversionRequestForm` modal component
- [x] 11. Build `EcocashConversionList` table component with status filters
- [x] 12. Build `EcocashConversionActions` approve/complete/reject dialogs
- [x] 13. Integrate conversion sections into Cash Bucket UI page
- [x] 14. Update Cash Bucket entry history to label and link `ECOCASH_CONVERSION` entries
- [x] 15. TypeScript check — no errors in any new files

---

## Out of Scope

- Partial conversions (a request is for a fixed amount only)
- Recurring or scheduled conversions
- Fee/spread on conversion rate (assumed 1:1)
- Reversal of a completed conversion (must be handled as a separate manual ledger entry if ever needed)

---

## Review

### Summary of Changes Made

**Database:**
- Added `EcocashConversion` Prisma model (table `ecocash_conversions`) with full lifecycle fields, optional `tenderedAmount` captured at approval, and FK-linked `outflowEntryId`/`inflowEntryId` to ledger entries
- Migration applied via `prisma migrate deploy` (not `migrate dev` due to pre-existing shadow DB conflict with `20260326000001_education_subcategories`)

**API — 7 new routes:**
- `POST/GET /api/ecocash-conversions` — create requests and list with filters
- `GET /api/ecocash-conversions/[id]` — single record with linked entries
- `PATCH /api/ecocash-conversions/[id]/approve` — captures `tenderedAmount`, validates eco-cash balance
- `PATCH /api/ecocash-conversions/[id]/complete` — atomic `prisma.$transaction` creating two `CashBucketEntry` rows (OUTFLOW ECOCASH + INFLOW CASH) both using `tenderedAmount`
- `PATCH /api/ecocash-conversions/[id]/reject` — with reason, from PENDING or APPROVED
- `GET /api/reports/ecocash-conversions` — date-range report with totals and variance

**UI — 3 new components:**
- `EcocashConversionRequestForm.tsx` — modal to submit a new request
- `EcocashConversionList.tsx` — tabular list with status filter pills; exports `EcocashConversion` interface
- `EcocashConversionActions.tsx` — single modal handling approve/complete/reject actions

**Cash Bucket page (`src/app/cash-bucket/page.tsx`):**
- Imported and integrated all three components
- Added `loadConversions()` alongside existing data loaders
- Added conversion section between balances grid and entries ledger
- Added `ECOCASH_CONVERSION` to `ENTRY_TYPE_LABEL` map and type-filter dropdown

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `tenderedAmount` captured at approval, not at request | Approver knows the current wallet balance and decides the actual exchange amount |
| No upper-bound on `tenderedAmount` vs `amount` | Surplus conversions are valid; only constraint is wallet balance ≥ `tenderedAmount` |
| Atomic `$transaction` at complete step | Prevents race conditions — OUTFLOW and INFLOW always created together or not at all |
| Race-condition guard in complete | Re-checks balance inside the transaction even after it was checked at approval |
| `entryType = ECOCASH_CONVERSION` (string) | No schema enum change needed; consistent with existing entry type pattern |

### Potential Follow-up Improvements

1. **Notifications** — push/email notification to manager when a conversion request is submitted
2. **Reversal workflow** — if a completed conversion needs to be reversed, a dedicated reverse endpoint (OUTFLOW CASH + INFLOW ECOCASH) would provide an audit trail
3. **Print receipt** — generate a printable receipt for the physical cash handover
4. **Report UI** — add a UI page for the eco-cash conversion report (currently API-only)
5. **Permission granularity** — currently reuses `cash_bucket.manage`; could be split into `cash_bucket.request_conversion` vs `cash_bucket.approve_conversion` for tighter RBAC

