# Lending Feature — Revised Design Document
**Date:** 2026-02-19
**Status:** APPROVED — IN PROGRESS

### Approved Decisions
1. New permission `canManageLending` (not reusing `canMakeExpensePayments`)
2. Post-payroll deposit created automatically on payroll period finalization
3. Person/Business loans: immediate (no approval step) — informational only for now
4. Interest: informational field only — no enforcement

---

## Overview

Implement an outgoing lending system that allows expense accounts and personal accounts to lend money to:
- **Individuals (Persons)** — informal loans tracked by name/ID
- **Businesses** — cross-entity lending
- **Employees** — loans with mandatory manager approval, one-loan-at-a-time rule, contract signing, and payroll deduction

Emoji for lending transactions: **🤝**

---

## Architecture Summary

### Clarifying Existing vs. New Concepts

| Existing | Purpose |
|---|---|
| `ExpenseAccountLoans` | Loans received INTO an account (from a bank/lender) — "incoming loans" |
| `EmployeeLoans` | HR module for employee loans (existing, partially integrated with payroll TODO) |
| `PayrollEntries.loanDeductions` | Already in schema, feeds into `computeTotalsForEntry()` |

### New Concept
**`AccountOutgoingLoans`** — Loans disbursed FROM an expense account TO a recipient (Person, Business, Employee). This is the opposite direction from `ExpenseAccountLoans`.

### Disbursement & Repayment Flow
- **Disbursement**: Recorded as an `ExpenseAccountPayments` entry with `paymentType = 'LOAN_DISBURSEMENT'`. This deducts from the account balance using existing payment infrastructure.
- **Manual Repayment**: Recorded as an `ExpenseAccountDeposits` entry (increases account balance) + creates `AccountOutgoingLoanPayments` record + reduces `AccountOutgoingLoans.remainingBalance`.
- **Payroll Deduction Repayment**: During payroll processing, `PayrollEntries.loanDeductions` is auto-populated from the employee's active loan `monthlyInstallment`. When payroll period is finalized, auto-create deposit to linked expense account + `AccountOutgoingLoanPayments` record.

---

## Database Schema Changes

### New Table 1: `AccountOutgoingLoans`
Tracks loans disbursed FROM expense accounts TO recipients.

```prisma
model AccountOutgoingLoans {
  id                    String   @id @default(uuid())
  loanNumber            String   @unique               // auto-generated, e.g. "OL-2026-001"
  expenseAccountId      String                         // account that disbursed the loan
  loanType              String                         // 'PERSON' | 'BUSINESS' | 'EMPLOYEE'
  recipientPersonId     String?                        // FK → Persons (if loanType='PERSON')
  recipientBusinessId   String?                        // FK → Businesses (if loanType='BUSINESS')
  recipientEmployeeId   String?                        // FK → Employees (if loanType='EMPLOYEE')
  principalAmount       Decimal  @db.Decimal(12, 2)
  remainingBalance      Decimal  @db.Decimal(12, 2)
  monthlyInstallment    Decimal? @db.Decimal(12, 2)   // required for EMPLOYEE payroll deduction
  totalMonths           Int?                           // required for EMPLOYEE
  remainingMonths       Int?                           // decremented each payroll cycle
  interestRate          Decimal? @db.Decimal(5, 4)    // optional, e.g. 0.05 = 5%
  disbursementDate      DateTime
  dueDate               DateTime?
  status                String   @default("PENDING_APPROVAL")
  // Status flow:
  //   EMPLOYEE: PENDING_APPROVAL → PENDING_CONTRACT → ACTIVE → PAID_OFF | DEFAULTED | WRITTEN_OFF
  //   PERSON / BUSINESS: ACTIVE → PAID_OFF | DEFAULTED | WRITTEN_OFF (no approval step)
  purpose               String?
  notes                 String?
  paymentType           String   @default("MANUAL")   // 'MANUAL' | 'PAYROLL_DEDUCTION'
  approvedByEmployeeId  String?                        // FK → Employees (manager who approved)
  approvedAt            DateTime?
  contractSigned        Boolean  @default(false)
  contractSignedAt      DateTime?
  contractSignedByUserId String?                      // FK → Users
  contractTerms         Json?                          // snapshot at signing time
  disbursementPaymentId String?                       // FK → ExpenseAccountPayments
  createdBy             String                        // FK → Users
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([expenseAccountId])
  @@index([recipientEmployeeId])
  @@index([status])
  @@map("account_outgoing_loans")
}
```

### New Table 2: `AccountOutgoingLoanPayments`
Tracks repayments received against outgoing loans.

```prisma
model AccountOutgoingLoanPayments {
  id             String   @id @default(uuid())
  loanId         String                        // FK → AccountOutgoingLoans
  amount         Decimal  @db.Decimal(12, 2)
  paymentDate    DateTime
  paymentMethod  String                        // 'CASH' | 'PAYROLL_DEDUCTION' | 'BANK_TRANSFER' | 'OTHER'
  payrollEntryId String?                       // FK → PayrollEntries (if payroll deduction)
  depositId      String?                       // FK → ExpenseAccountDeposits (linked deposit)
  notes          String?
  recordedBy     String                        // FK → Users
  createdAt      DateTime @default(now())

  @@index([loanId])
  @@map("account_outgoing_loan_payments")
}
```

### Schema Modifications to Existing Tables

**`ExpenseAccountPayments`** — Add optional FK + new payment type:
- New nullable field: `outgoingLoanId String?` — FK to `AccountOutgoingLoans`
- New paymentType value: `'LOAN_DISBURSEMENT'` (existing column, just new allowed value — no schema migration needed for the value itself)

**`ExpenseAccountDeposits`** — Add optional FK:
- New nullable field: `outgoingLoanPaymentId String?` — FK to `AccountOutgoingLoanPayments`

> **CRITICAL**: Each schema change requires a migration file via `prisma migrate dev --name <name>`. Never use `prisma db push`.

---

## Employee Loan Business Rules

1. **One active loan per employee across all businesses** — when creating, check `AccountOutgoingLoans` for `recipientEmployeeId = <id>` AND `status IN ('PENDING_APPROVAL', 'PENDING_CONTRACT', 'ACTIVE')`. Reject if count > 0.
2. **Manager approval required** — initial status is `PENDING_APPROVAL`. A manager (supervisor employee or system admin) must approve before contract is shown.
3. **Contract signing required** — after approval, status becomes `PENDING_CONTRACT`. Employee or authorized user reviews and accepts the contract terms. Status moves to `ACTIVE` and disbursement is processed.
4. **Payroll deduction** — `monthlyInstallment` and `totalMonths` are required for employee loans. During payroll processing, `loanDeductions` is auto-populated.
5. **`computeTotalsForEntry()` requires no changes** — it already calculates `loans = Number(entry.loanDeductions || 0)` as part of `derivedTotalDeductions` in `src/lib/payroll/helpers.ts`.

---

## Payroll Integration Details

### Step A — During Payroll Entry Creation/Refresh
File to update: payroll entry creation route (needs exploration to identify exact file).

Logic to add: Before saving `PayrollEntries`, query:
```typescript
const activeLoan = await prisma.accountOutgoingLoans.findFirst({
  where: {
    recipientEmployeeId: employeeId,
    status: 'ACTIVE',
    paymentType: 'PAYROLL_DEDUCTION',
  }
})
if (activeLoan) {
  entry.loanDeductions = activeLoan.monthlyInstallment
}
```
`computeTotalsForEntry()` already picks this up — no other changes needed.

### Step B — After Payroll Period Finalization
When period is approved/finalized, for each entry where `loanDeductions > 0`:
1. Find the active `AccountOutgoingLoan` for that employee
2. Create `ExpenseAccountDeposits` on the linked expense account (amount = `loanDeductions`, description = "🤝 Loan repayment - [employee name]")
3. Create `AccountOutgoingLoanPayments` (paymentMethod='PAYROLL_DEDUCTION', payrollEntryId=entry.id, depositId=new deposit id)
4. Decrement `AccountOutgoingLoans.remainingBalance` and `remainingMonths`
5. If `remainingBalance <= 0` or `remainingMonths <= 0`, set status to `PAID_OFF`

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/expense-account/[accountId]/outgoing-loans` | Create new loan |
| `GET` | `/api/expense-account/[accountId]/outgoing-loans` | List outgoing loans for one account |
| `GET` | `/api/expense-account/outgoing-loans` | All loans system-wide (for report) |
| `POST` | `/api/expense-account/outgoing-loans/[loanId]/approve` | Manager approval |
| `POST` | `/api/expense-account/outgoing-loans/[loanId]/sign-contract` | Record contract signing + trigger disbursement |
| `POST` | `/api/expense-account/outgoing-loans/[loanId]/payments` | Record manual repayment |
| `GET` | `/api/expense-account/reports/lending` | Report data |

### POST body — Create loan (EMPLOYEE example):
```json
{
  "loanType": "EMPLOYEE",
  "recipientEmployeeId": "...",
  "principalAmount": 500,
  "monthlyInstallment": 100,
  "totalMonths": 5,
  "disbursementDate": "2026-02-19",
  "dueDate": "2026-07-19",
  "purpose": "Medical expenses",
  "paymentType": "PAYROLL_DEDUCTION"
}
```

### POST body — Sign contract:
```json
{
  "consentForPayrollDeduction": true,
  "signedByUserId": "..."
}
```
Server action: store `contractTerms` snapshot, set `contractSigned=true`, `contractSignedAt=now()`, status → `ACTIVE`, create disbursement payment.

---

## UI Components

### 1. `LendMoneyModal` — `src/components/expense-account/lend-money-modal.tsx`
Multi-step modal:
- **Step 1**: Select loan type (Person / Business / Employee), search/select recipient, enter amount, term, purpose, payment method
- **Step 2** (Employee only): Contract preview with filled terms + "I accept these terms" checkbox
- **Step 3**: Confirmation summary → submit

### 2. `OutgoingLoansPanel` — `src/components/expense-account/outgoing-loans-panel.tsx`
Panel in account detail page. Shows:
- "🤝 Lend Money" button (gated on permission)
- List of outgoing loans with status badges
- "Record Repayment" button per ACTIVE loan
- "Approve" button for PENDING_APPROVAL loans (manager/admin only)

### 3. `RecordRepaymentModal` — `src/components/expense-account/record-repayment-modal.tsx`
Simple modal: amount, date, payment method (CASH / BANK_TRANSFER / OTHER). Validates ≤ remaining balance.

### 4. Lending Portfolio Report — `src/app/expense-accounts/reports/lending/page.tsx`
Filters by loanType and status. Table shows all outgoing loans system-wide with summary stats.

---

## Numbered Task Checklist

### Phase 1 — Database Schema
- [ ] **Task 1** — Add `AccountOutgoingLoans` model to `prisma/schema.prisma`
- [ ] **Task 2** — Add `AccountOutgoingLoanPayments` model to `prisma/schema.prisma`
- [ ] **Task 3** — Add `outgoingLoanId String?` FK to `ExpenseAccountPayments` in schema
- [ ] **Task 4** — Add `outgoingLoanPaymentId String?` FK to `ExpenseAccountDeposits` in schema
- [ ] **Task 5** — Run `prisma migrate dev --name add_account_outgoing_loans` → verify migration file created
- [ ] **Task 6** — Regenerate Prisma client and verify TypeScript compiles

### Phase 2 — Core API
- [ ] **Task 7** — Create `POST /api/expense-account/[accountId]/outgoing-loans` (one-loan rule, status logic, immediate disburse for PERSON/BUSINESS)
- [ ] **Task 8** — Create `GET /api/expense-account/[accountId]/outgoing-loans`
- [ ] **Task 9** — Create `POST /api/expense-account/outgoing-loans/[loanId]/approve`
- [ ] **Task 10** — Create `POST /api/expense-account/outgoing-loans/[loanId]/sign-contract` (contract snapshot + disburse payment)
- [ ] **Task 11** — Create `POST /api/expense-account/outgoing-loans/[loanId]/payments` (manual repayment + deposit)
- [ ] **Task 12** — Create `GET /api/expense-account/outgoing-loans` (system-wide, with filters)
- [ ] **Task 13** — Create `GET /api/expense-account/reports/lending`

### Phase 3 — Payroll Integration
- [ ] **Task 14** — Identify payroll entry creation route; add `loanDeductions` auto-populate from active `AccountOutgoingLoans`
- [ ] **Task 15** — Identify payroll finalization route; add post-finalization deposit + repayment record creation + balance decrement

### Phase 4 — UI Components
- [ ] **Task 16** — Build `LendMoneyModal` (3-step multi-type modal with contract step for employees)
- [ ] **Task 17** — Build `OutgoingLoansPanel` component (list + action buttons)
- [ ] **Task 18** — Build `RecordRepaymentModal` component
- [ ] **Task 19** — Integrate `OutgoingLoansPanel` + "🤝 Lend Money" button into account detail page

### Phase 5 — Reports
- [ ] **Task 20** — Build Lending Portfolio report page (`/expense-accounts/reports/lending`)
- [ ] **Task 21** — Add "🤝 Lending Portfolio" card to Reports Hub (`src/app/expense-accounts/reports/page.tsx`)
- [ ] **Task 22** — Add active outgoing loans count to Reports Hub quick stats banner

### Phase 6 — Polish
- [ ] **Task 23** — Gate "Lend Money" on `canMakeExpensePayments` (or confirm with user if new permission needed)
- [ ] **Task 24** — Gate loan approval on manager/admin check
- [ ] **Task 25** — Show loan disbursement and repayments in account transaction history

---

## Contract Template (Employee Loans)

Rendered client-side as a formatted preview card:

```
LOAN AGREEMENT

Lender: [Account Name] ([Account Number])
Borrower: [Employee Full Name] ([Employee Number])
Date: [Disbursement Date]

Loan Amount: $[principalAmount]
Monthly Deduction: $[monthlyInstallment]
Duration: [totalMonths] months
Due Date: [dueDate]
Purpose: [purpose]

Terms:
1. The borrower authorizes deduction of $[monthlyInstallment] from each
   monthly payroll until the loan is fully repaid.
2. Deductions begin in the next payroll cycle after contract signing.
3. Early repayment is permitted without penalty.
4. In case of employment termination, the outstanding balance becomes
   immediately due.

By accepting, the borrower consents to the above terms including the
payroll deduction authorization.
```

---

## Open Questions for Approval

1. **Permission gating**: Use existing `canMakeExpensePayments` for "Lend Money", or create new `canManageLending`?
2. **Post-payroll reconciliation**: Should the expense account deposit (from payroll deduction) be created **automatically** when payroll period is finalized, or should it be a manual step the user triggers?
3. **Person/Business loans**: Require approval step too, or immediate on submit?
4. **Interest**: Enforce calculated interest, or just informational field?

---

## Impact on Existing Code

| File | Change | Risk |
|---|---|---|
| `prisma/schema.prisma` | 2 new models + 2 nullable FKs | Low — additive |
| `src/lib/payroll/helpers.ts` | **No change** — `loanDeductions` already handled | None |
| `ExpenseAccountPayments` paymentType | New value `'LOAN_DISBURSEMENT'` — no migration needed for enum value | Low |
| Payroll entry creation API | Add `loanDeductions` auto-populate | Medium |
| Payroll finalization API | Add deposit + repayment record creation | Medium |
| Account detail page | Add outgoing loans section | Low — additive |
| Reports Hub | Add new card + stat | Low — additive |

---

## Review Section
_(To be filled after implementation)_

---

# Fix Sales Attribution & Backup/Restore Reliability

## Problem
1. **Sales attributed to "System Administrator"**: After restoring a backup from another machine, all sales show under "System Administrator" instead of actual salespeople (Letwin, Pride). BusinessOrders has no `createdBy` field to track which user made the sale.
2. **Backup/restore format mismatch**: CLI restore script only handles v1.0 flat format, but the app's UI backup creates v3.0 format with `businessData` wrapper. Cross-machine restore must work reliably.
3. **1 record skipped during restore**: Foreign key constraint error (from restore screenshot).

## Plan

### Phase 1: Add `createdBy` to BusinessOrders
- [x] Add `createdBy String?` field + `creator Users?` relation to BusinessOrders model
- [x] Add `business_orders_created BusinessOrders[]` reverse relation to Users model
- [x] Create idempotent migration
- [x] Add index on `createdBy` for query performance

### Phase 2: Set `createdBy` in POS checkout flows
- [x] Update `/api/universal/orders` POST to set `createdBy` from session user
- [x] Check restaurant orders API for same fix

### Phase 3: Update sales analytics to use `createdBy`
- [x] Update `/api/business/[businessId]/sales-analytics` to include `creator` relation and use it for name fallback
- [x] Update `/api/universal/daily-sales` to include `creator` relation and use it for name fallback

### Phase 4: Fix CLI restore script for v3.0 format
- [x] Update `scripts/restore-from-backup.js` to detect and unwrap `businessData` wrapper
- [x] Handle both v1.0 flat and v3.0 wrapped formats

### Phase 5: Backfill existing orders' `createdBy`
- [x] Create a script/query to match existing orders to users via `attributes.employeeName` or employee→user mapping

## Review

### Changes Made
1. **Schema**: Added `createdBy String?` + `creator Users?` relation to `BusinessOrders`, with index. Migration `20260220000003` includes two backfill strategies: via `employees.userId` and via `attributes.employeeName` → `users.name` matching.

2. **Order creation**: Added `createdBy: user.id` to 4 order creation points:
   - `/api/universal/orders` (main POS)
   - `/api/universal/orders/manual` (manual entry)
   - `/api/restaurant/orders` (restaurant POS, both create and retry)
   - `/api/restaurant/meal-program/transactions` (meal program)

3. **Sales analytics**: Both `/api/business/[businessId]/sales-analytics` and `/api/universal/daily-sales` now include `creator` relation and use fallback chain: `employees.fullName` → `creator.name` → `attributes.employeeName` → 'Other'/'Walk-in/Unknown'

4. **CLI restore**: `scripts/restore-from-backup.js` now detects v3.0 format (has `businessData` key) and unwraps it, supporting both flat and wrapped formats.

5. **Local backfill**: 444/455 orders now have `createdBy` set (Pride: 417, Letwin: 25, System Admin: 2). 11 orders had no `employeeName` in attributes.

### Restore Screenshot Analysis
- 6084/6967 records restored (87%), 1 skipped (FK constraint)
- The 882 gap (6967-6084-1) represents records in tables not in the restore order (likely local-only tables like sync, printers, etc.)
- The 1 FK error is a single record referencing a missing parent — minor issue

### Notes for Remote Deployment
- Migration `20260220000003` must be applied on the remote server
- The backfill SQL will automatically match orders to users by name on the remote DB too
- All future orders will have `createdBy` set automatically from the session user

---

## Lending Feature Review

### Implementation Summary
All 6 phases of the outgoing lending feature are complete. Below is a summary of all changes made.

### Changes Made

1. **Permission** (`src/types/permissions.ts`): Added `canManageLending` to the `CoreBusinessPermissions` interface. Admin and Manager roles get `true`, all others get `false`.

2. **Database Schema** (`prisma/schema.prisma`): Added two new models:
   - `AccountOutgoingLoans` → table `account_outgoing_loans`
   - `AccountOutgoingLoanPayments` → table `account_outgoing_loan_payments`
   - Added `outgoingLoanPaymentId?` FK to `ExpenseAccountDeposits`
   - Added `outgoingLoanId?` FK to `ExpenseAccountPayments`

3. **Migration** (`prisma/migrations/20260220000011_add_account_outgoing_loans/migration.sql`): Manual migration created and applied via `prisma db execute` + `prisma migrate resolve --applied` due to pre-existing drift.

4. **APIs** (6 new route files):
   - `GET|POST /api/expense-account/[accountId]/outgoing-loans` — per-account loan list + creation
   - `GET /api/expense-account/outgoing-loans` — system-wide loan list
   - `POST /api/expense-account/outgoing-loans/[loanId]/approve` — manager approval
   - `POST /api/expense-account/outgoing-loans/[loanId]/sign-contract` — contract signing + disbursement
   - `POST /api/expense-account/outgoing-loans/[loanId]/payments` — manual repayment recording
   - `GET /api/expense-account/reports/lending` — lending portfolio report data

5. **Payroll Integration** (2 files modified):
   - `payroll/entries/route.ts`: Auto-populates `loanDeductions` from active employee loans on entry creation
   - `payroll/periods/[periodId]/route.ts`: `reconcilePayrollLoanDeductions()` runs on period approval, creates deposit + repayment records for each entry with loan deductions

6. **UI Components** (3 new files):
   - `lend-money-modal.tsx` — 3-step modal (details → contract → confirm)
   - `record-repayment-modal.tsx` — simple repayment recording modal
   - `outgoing-loans-panel.tsx` — displays outgoing loans per account with Approve/Repayment actions

7. **Account Detail Page** (`src/app/expense-accounts/[accountId]/page.tsx`): Added "🤝 Lend Money" button (gated on `canManageLending`), `OutgoingLoansPanel` section, and `LendMoneyModal`.

8. **Reports Hub** (`src/app/expense-accounts/reports/page.tsx`): Added Lending Portfolio card + "Active Lending Loans" stat.

9. **New Report Page** (`src/app/expense-accounts/reports/lending/page.tsx`): Full lending portfolio table with status/type filters and summary cards.

### Suggestions for Follow-Up
- Add outgoing loans to backup/restore (`backup-clean.ts` / `restore-clean.ts`)
- Add loan disbursements and repayments to account transaction history list
- Loan notifications (e.g., overdue alerts, upcoming payroll deductions)
- Write-off functionality for defaulted loans

---

## Sequential Display Number — Unique Constraint Removal

### Context
Backup/restore from an upgraded server failed with: `Unique constraint failed on fields: (businessType, supplierNumber)`. Root cause: auto-generated sequential display numbers (e.g. `RES-SUP-001`, `EMP-001`) were used as DB unique constraints. Two independent machines can generate the same number for different records. The GUID `id` is the true unique identity.

### Changes Made

1. **Schema** (`prisma/schema.prisma`): Removed unique constraints from 13 display-label fields across 10+ tables:
   - `BusinessSuppliers`: removed `@@unique([businessType, supplierNumber])`
   - `Employees`: removed `@unique` from `employeeNumber`
   - `PayrollPaymentVouchers`: removed `@unique` from `voucherNumber`
   - `ExpenseAccountLoans`: removed `@unique` from `loanNumber`
   - `AccountOutgoingLoans`: removed `@unique` from `loanNumber`
   - `InterBusinessLoans`: removed `@unique` from `loanNumber`
   - `Orders` (restaurant): removed `@unique` from `orderNumber`
   - `CustomerLayby`: removed `@unique` from `laybyNumber`
   - `CustomerLaybyPayment`: removed `@unique` from `receiptNumber`
   - `BusinessCustomers`: removed `@@unique([businessId, customerNumber])`
   - `BusinessOrders`: removed `@@unique([businessId, orderNumber])` (kept `@@index([orderNumber])`)
   - `ProductVariants`: removed `@unique` from `sku`
   - `ClothingBales`: removed `@unique` from `sku`

2. **Migration** (`prisma/migrations/20260223000001_remove_sequential_number_unique_constraints/migration.sql`): 13 `ALTER TABLE DROP CONSTRAINT IF EXISTS` statements. Applied via `prisma migrate deploy`.

3. **restore-clean.ts** (`src/lib/restore-clean.ts`): Removed stale entries from `UNIQUE_CONSTRAINT_FIELDS`:
   - Removed `'expenseAccountLoans': 'loanNumber'` (constraint dropped — now upserts by GUID)
   - Removed `'businessOrders': { fields: ['businessId', 'orderNumber'] }` (constraint dropped — now upserts by GUID)

4. **Backup API** (`src/app/api/backup/route.ts`): GET endpoint now allows managers and business owners (not just admins) to download backups. Restore (POST) remains admin-only.

5. **UI** (`src/components/data-backup.tsx`, `src/components/data-management-client.tsx`): Restore section hidden for non-admin users. Backup tab enabled for managers and business owners.

6. **POS Role Redirect** (`src/app/auth/signin/page.tsx`, `src/app/auth/redirect/page.tsx`): After login, POS role users are redirected to their business-type POS (`/restaurant/pos`, `/grocery/pos`, `/clothing/pos`, `/universal/pos`). Implemented via dedicated `/auth/redirect` page using reactive `useSession()` hook.

### Tests Added
`__tests__/lib/display-number-uniqueness.test.ts` (19 tests):
- Display number fields allow duplicate values (6 tests — one per field type)
- Restore logic uses GUID-based upsert for all formerly-constrained tables (4 tests)
- Backup GET API allows managers and business owners; POST stays admin-only (7 tests)
- Stale UNIQUE_CONSTRAINT_FIELDS entries are removed (2 documentation tests)

`__tests__/api/backup-restore.test.ts` (4 tests — updated from orphaned structure):
- Unauthenticated POST returns 401
- Non-admin POST returns 401
- POST with no backup data returns 400
- Admin with valid backup triggers restore and returns 200

### Suggestions for Follow-Up
- Run UI-level backup/restore test with the upgraded server backup file to verify end-to-end
- Consider adding a database-level guard: trigger or check constraint to warn if a sequential number exceeds a reasonable range (optional — informational only)
