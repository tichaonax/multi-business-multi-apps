# Feature: EOD Auto-Deposit to Expense Accounts

**Status:** ✅ IMPLEMENTED — Phases 0–6 complete  
**Date:** 2026-03-06  
**Implemented:** 2026-03-06  
**Scope:** All business types (restaurant, clothing, grocery, hardware)

---

## 1. Feature Summary

On close of business day (EOD), the system automatically presents the user with a pre-configured list of expense accounts to deposit money into from the business's operating (deposit) account. Each deposit is a pre-set daily amount, built up incrementally to offset upcoming bills (rent, loan repayments, utilities, etc.). The user can override individual amounts and skip non-critical deposits, subject to guardrail checks. Rent account deposits are given priority and cannot be skipped.

---

## 2. Problem Being Solved

Businesses accumulate recurring obligations (rent, loan repayments, etc.) but money is often not reserved in advance, leading to cash flow surprises. This feature enforces disciplined daily micro-reservations into dedicated expense accounts so money is set aside before it is spent elsewhere.

---

## 3. Key Concepts

| Term | Definition |
|------|------------|
| **Auto-Deposit Config** | A per-business record linking an expense account to a daily deposit amount |
| **EOD Auto-Deposit** | The step at End of Day where configured deposits are presented for confirmation |
| **Deposit Account** | Each business has one primary deposit account (`Businesses.balance`) — this is the source for all EOD auto-deposits |
| **Priority Account** | The RENT account — always listed first, cannot be skipped, has a minimum amount |
| **Override** | User changes the deposit amount for a single entry during EOD confirmation |

---

## 4. User Stories

| # | As a... | I want to... | So that... |
|---|---------|--------------|------------|
| US1 | Business owner/admin | Set up a list of expense accounts with daily deposit amounts | Money is automatically reserved at EOD toward bills |
| US2 | Manager closing the day | See a clear summary of pending auto-deposits before confirming EOD close | I know what will leave the deposit account |
| US3 | Manager closing the day | Override the deposit amount for a specific account | I can adjust for unusual days (e.g., slow day) |
| US4 | Manager closing the day | Skip a non-critical deposit for today | I can skip non-essential reservations when funds are tight |
| US5 | Manager | See the rent deposit listed and know I cannot skip it | Rent savings are always protected |
| US6 | Admin | Grant a specific user the ability to configure auto-deposits without giving them EOD close permission | Separation of duties between setup and operations |

---

## 5. Functional Requirements

### 5.1 Auto-Deposit Configuration (Setup)

| # | Priority | Requirement |
|---|----------|-------------|
| R1 | MUST | Admin/authorised users can create auto-deposit configs: link a business expense account + daily deposit amount |
| R2 | MUST | Each config has: expense account, daily deposit amount, active/inactive status, display order/priority |
| R3 | MUST | Rent account (accountType = 'RENT') is automatically included and assigned priority 1; it need not be manually added — it is injected from `BusinessRentConfig.dailyTransferAmount` |
| R4 | MUST | Non-rent configs can be manually added, edited, reordered, and deleted |
| R5 | MUST | Only expense accounts belonging to the same business can be configured |
| R6 | MUST | Maximum of 10 auto-deposit entries per business (enforced server-side and UI) |
| R7 | MUST | A new permission `canManageAutoDeposits` (business-level) gates access to the setup UI |
| R8 | MUST | `canManageAutoDeposits` is separate from EOD deposit processing — processing at EOD requires only the existing `canMakeExpenseDeposits` permission (no new EOD-specific permission needed) |

### 5.2 EOD Auto-Deposit Flow

| # | Priority | Requirement |
|---|----------|-------------|
| R9 | MUST | When a user initiates EOD close, after existing EOD steps, a new **Auto-Deposit Summary** step is presented |
| R10 | MUST | The summary lists all active auto-deposit entries for that business, rent account first |
| R11 | MUST | Each entry shows: account name, configured daily amount, override input, skip checkbox |
| R12 | MUST | Skip checkbox is **checked (enabled) by default** for all non-rent accounts |
| R13 | MUST | Rent account row: skip checkbox is **absent / permanently disabled** |
| R14 | MUST | User may override rent deposit amount **upward only** — cannot go below the configured `dailyTransferAmount` |
| R15 | MUST | User may override non-rent amounts freely (any positive value) |
| R16 | MUST | The summary shows a running total of deposits and the current deposit account balance |
| R17 | MUST | If deposit account balance < sum of all enabled deposits → display a blocking warning; all auto-deposits are skipped; EOD can still close without them |
| R18 | MUST | Total enabled deposits must not exceed today's **net confirmed sales** (voided/refunded transactions excluded); if they do, show a warning and block confirmation until the user adjusts or skips enough entries |
| R19 | SHOULD | If the deposit account has insufficient funds even for only the rent deposit, the rent deposit is also skipped but a prominent alert is shown |
| R20 | MUST | On confirmation, each enabled (non-skipped) deposit is recorded as an `ExpenseAccountDeposits` entry with `sourceType = 'EOD_AUTO_DEPOSIT'` and `sourceBusinessId = businessId` |
| R21 | MUST | The business deposit account balance (`Businesses.balance`) is debited by the total of processed deposits |
| R22 | MUST | If the existing rent EOD transfer (`autoTransferOnEOD = true`) is active, it must **not** double-process — the auto-deposit system replaces the current rent EOD transfer for rent accounts managed via this system |
| R23 | MUST | Only **processed** (non-skipped) deposits are logged; skipped entries require no audit record |

### 5.3 Guard Rails Summary

| Condition | Behaviour |
|-----------|-----------|
| Deposit account balance < total enabled deposits | Block all auto-deposits, show warning, EOD still closes |
| Total enabled deposits > today's gross sales | Warn and block confirmation until adjusted |
| Rent override < configured minimum | Prevent submission with inline error |
| No auto-deposit configs set up | Auto-deposit step is skipped silently at EOD |
| All auto-deposits skipped by user | EOD closes normally, no deposits processed |

### 5.4 Existing Rent EOD Transfer

The current mechanism (`EodRentTransferSection` + `autoTransferOnEOD`) will be **superseded** for any business that has auto-deposit configs set up. Specifically:
- If a business has an active `AutoDepositConfig` and the rent account is included, the standalone rent EOD transfer section is hidden in favour of the unified auto-deposit summary.
- If a business has `BusinessRentConfig` but **no** auto-deposit configs, the existing rent transfer section continues as before (backward compatibility).

---

## 6. Permission Design

### New Permission: `canManageAutoDeposits` (Business-Level)

| Role | Default |
|------|---------|
| Owner / Admin | `true` |
| Manager | `false` (can be granted) |
| Supervisor | `false` |
| Cashier | `false` |

This permission is added to `CoreBusinessPermissions` and displayed in the Expense Account Management group of the permissions editor.

### Existing Permission Reuse

| Permission | Used For |
|-----------|----------|
| `canMakeExpenseDeposits` | Processing auto-deposits at EOD — **confirmed sufficient**, no new EOD permission needed |
| Manager signature field | Existing informal auth for EOD close — unchanged |

---

## 7. Data Model

### New Table: `expense_account_auto_deposits`

```prisma
model ExpenseAccountAutoDeposit {
  id                 String          @id @default(uuid())
  businessId         String
  expenseAccountId   String
  dailyAmount        Decimal         @db.Decimal(12, 2)
  displayOrder       Int             @default(10)   // lower = shown first; rent injected at 0
  isActive           Boolean         @default(true)
  notes              String?
  createdBy          String
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @default(now()) @updatedAt

  business           Businesses      @relation(fields: [businessId], references: [id], onDelete: Cascade)
  expenseAccount     ExpenseAccounts @relation(fields: [expenseAccountId], references: [id])
  creator            Users           @relation(fields: [createdBy], references: [id])

  @@unique([businessId, expenseAccountId])
  @@index([businessId])
  @@map("expense_account_auto_deposits")
}
```

### `ExpenseAccountDeposits` — new `sourceType` value

| Value | Meaning |
|-------|---------|
| `'EOD_AUTO_DEPOSIT'` | Deposit created by the EOD auto-deposit flow |

### Audit Log

No separate log table required. Only **processed** deposits are recorded (as `ExpenseAccountDeposits` entries). Skipped entries are not logged — the `ExpenseAccountDeposits` history serves as the full audit trail.

---

## 8. UI Overview

### 8.1 Setup Page: `/expense-accounts/auto-deposits` (or business settings)

- List view of all configured auto-deposit entries
- Add new entry: pick expense account (dropdown, filtered to this business), enter daily amount
- Edit existing entry: change amount, toggle active, adjust order
- Delete entry
- Rent account shown as a locked read-only entry if `BusinessRentConfig` exists (can only edit display order)
- Accessible via business settings or expense accounts navigation
- Gated by `canManageAutoDeposits`

### 8.2 EOD Summary Step (new component: `AutoDepositEodSummary`)

```
┌─────────────────────────────────────────────────────┐
│ 💰 End-of-Day Auto-Deposits                         │
│ Deposit account balance: $312.50  |  Today's sales: $850.00  │
├──────────────────┬──────────────┬────────────────────┤
│ Account          │ Amount       │ Include            │
├──────────────────┼──────────────┼────────────────────┤
│ 🏠 Rent Account  │ [$  13.00 ↑] │ [🔒 always]        │
│ 💳 Loan #1       │ [$   9.00  ] │ [✓ include]        │
│ ⚡ Utilities     │ [$  12.00  ] │ [✓ include]        │
├──────────────────┼──────────────┼────────────────────┤
│ Total to deposit │ $  34.00     │                    │
└──────────────────┴──────────────┴────────────────────┘
[Cancel] [Confirm & Close Day]
```

- Running total updates live as user overrides or unchecks entries
- Insufficient funds warning banner appears above table if needed
- Sales guardrail warning appears if total > today's sales

---

## 9. Out of Scope

- Mobile app integration (future)
- Recurring deposit scheduling outside EOD (future)
- Automatic approval of deposits without user confirmation (future)
- Multi-currency support
- Editing past EOD auto-deposit runs

---

## 10. Acceptance Criteria

| # | Criterion | Pass Condition |
|---|-----------|---------------|
| AC1 | Setup UI accessible to users with `canManageAutoDeposits` only | Non-authorised users see 403 |
| AC2 | Rent account always listed first in EOD summary when rent config exists | Rent row appears at top with lock icon |
| AC3 | Skip checkbox absent on rent row | No checkbox rendered for rent |
| AC4 | Rent override rejects amounts below minimum | Inline error shown, submission blocked |
| AC5 | Insufficient deposit account balance blocks all deposits | Warning shown, "Confirm" button disabled |
| AC6 | Over-sales guardrail blocks confirmation | Warning shown until user reduces total |
| AC7 | Confirmed deposits appear in expense account deposit history | Deposits visible in account ledger |
| AC8 | Business deposit account balance decremented by total | Balance reflects withdrawals |
| AC9 | Existing standalone rent EOD transfer hidden when auto-deposit configs present | No duplicate rent transfer |
| AC10 | EOD can still close even if all auto-deposits are skipped/blocked | Close day proceeds normally |
| AC11 | All 4 business types (restaurant, clothing, grocery, hardware) support the feature | EOD modal updates deploy to all 4 EOD pages |

---

---

# Project Plan

## Phases & Tasks

---

### Phase 0 — Schema & Migration
**Estimated effort: 0.5 day**

- [ ] **T0.1** Add `ExpenseAccountAutoDeposit` model to `prisma/schema.prisma`
  - Fields: `id`, `businessId`, `expenseAccountId`, `dailyAmount`, `displayOrder`, `isActive`, `notes`, `createdBy`, `createdAt`, `updatedAt`
  - Unique constraint: `[businessId, expenseAccountId]`
  - Relations: Businesses, ExpenseAccounts, Users
  - Add reverse relation `auto_deposit_configs` on `ExpenseAccounts` and `Businesses`
- [ ] **T0.2** Run `prisma migrate dev --name add_expense_account_auto_deposits`
- [ ] **T0.3** Regenerate Prisma client

---

### Phase 1 — Permission
**Estimated effort: 0.5 day**

- [ ] **T1.1** Add `canManageAutoDeposits: boolean` to `CoreBusinessPermissions` interface in `src/types/permissions.ts`
- [ ] **T1.2** Set defaults in all role preset blocks in `permissions.ts`:
  - Owner/Admin: `true`
  - Manager/Supervisor/Cashier/others: `false`
- [ ] **T1.3** Add permission to the Expense Account Management group in the permissions display config (same file, `permissionGroups` array)
- [ ] **T1.4** Update `getDriverOnlyPermissions()` and any other permission factory functions in `src/lib/permission-utils.ts`

---

### Phase 2 — API: Auto-Deposit Config CRUD
**Estimated effort: 1 day**

- [ ] **T2.1** `GET /api/business/[businessId]/expense-auto-deposits`
  - Returns all active configs for the business, sorted by `displayOrder`
  - Injects the rent account entry (from `BusinessRentConfig`) at position 0 if it exists
  - Auth: `canManageAutoDeposits` or `canMakeExpenseDeposits`
  - Enforces max 10 entries check on POST
- [ ] **T2.2** `POST /api/business/[businessId]/expense-auto-deposits`
  - Creates a new config entry
  - Validates: expense account belongs to this business, not already configured, not RENT type (rent is auto-injected)
  - Auth: `canManageAutoDeposits`
- [ ] **T2.3** `PUT /api/business/[businessId]/expense-auto-deposits/[id]`
  - Updates `dailyAmount`, `displayOrder`, `isActive`, `notes`
  - Auth: `canManageAutoDeposits`
- [ ] **T2.4** `DELETE /api/business/[businessId]/expense-auto-deposits/[id]`
  - Soft-delete (set `isActive = false`) or hard delete
  - Cannot delete the rent entry (it is derived, not stored)
  - Auth: `canManageAutoDeposits`

---

### Phase 3 — API: EOD Preview Endpoint
**Estimated effort: 1 day**

- [ ] **T3.1** `GET /api/business/[businessId]/expense-auto-deposits/eod-preview`
  - Returns:
    - All active auto-deposit configs (rent first)
    - `depositAccountBalance`: current value of `Businesses.balance` (primary deposit account)
    - `todayNetSales`: sum of today's **net confirmed** sales (excludes voided/refunded transactions)
    - `totalConfiguredDeposits`: sum of all daily amounts
    - `canProcess`: boolean — `depositAccountBalance >= totalConfiguredDeposits`
    - `insufficientFundsWarning`: message if balance is insufficient
    - `overSalesWarning`: message if total > net sales
  - Auth: `canMakeExpenseDeposits`
- [ ] **T3.2** `POST /api/business/[businessId]/expense-auto-deposits/eod-process`
  - Accepts array of `{ expenseAccountId, amount, skipped }` entries
  - Validates:
    - `Businesses.balance` (deposit account) ≥ sum of non-skipped amounts
    - Sum of non-skipped amounts ≤ today's net confirmed sales
    - Rent amount ≥ `BusinessRentConfig.dailyTransferAmount` minimum
  - Creates `ExpenseAccountDeposits` records **only for non-skipped entries** (`sourceType = 'EOD_AUTO_DEPOSIT'`)
  - Debits `Businesses.balance` by total processed amount in a single transaction
  - Returns summary of processed entries only
  - Auth: `canMakeExpenseDeposits`

---

### Phase 4 — Setup UI
**Estimated effort: 1.5 days**

- [ ] **T4.1** Create component `src/components/expense-account/auto-deposit-config-list.tsx`
  - Displays list of configured entries (rent locked at top, others editable)
  - Inline edit for `dailyAmount`, `displayOrder`, active toggle
  - Delete button for non-rent entries
  - Add new entry form: account picker + amount input
- [ ] **T4.2** Create page `src/app/expense-accounts/auto-deposits/page.tsx`
  - Business-scoped (uses `currentBusinessId` from context)
  - Gated by `canManageAutoDeposits`
  - Title: "Auto-Deposit Configuration"
  - Uses `AutoDepositConfigList` component
- [ ] **T4.3** Add navigation link to the auto-deposit setup page
  - In expense accounts list page (`/expense-accounts`) — add settings/gear link for users with `canManageAutoDeposits`
  - Optionally add to business settings navigation
- [ ] **T4.4** Add "Auto-Deposits" entry to the sidebar navigation under Expense Accounts (conditional on permission)

---

### Phase 5 — EOD Auto-Deposit Summary Component
**Estimated effort: 1.5 days**

- [ ] **T5.1** Create `src/components/reports/auto-deposit-eod-summary.tsx`
  - Props: `businessId`, `todayNetSales`, `onConfirm(entries)`, `onSkipAll`, `depositAccountBalance`
  - Fetches configs from `eod-preview` endpoint on mount
  - Renders table: account name, amount input, skip checkbox (disabled for rent)
  - Computes running total reactively
  - Enforces minimum on rent override (inline error)
  - Shows insufficient funds banner when applicable
  - Shows over-sales guardrail banner when applicable
  - "Confirm & Close Day" button disabled when guardrails are violated
  - "Skip All & Close" option to bypass all auto-deposits

- [ ] **T5.2** Integrate into restaurant EOD page (`src/app/restaurant/reports/end-of-day/page.tsx`)
  - Add auto-deposit step after existing save/signature section
  - Show `AutoDepositEodSummary` as a modal or inline section before final EOD save
  - If no configs exist → step skipped silently
  - If configs exist AND `autoTransferOnEOD` rent config exists → hide the existing `EodRentTransferSection`
  - Call `eod-process` API on confirm

- [ ] **T5.3** Integrate into clothing EOD page
- [ ] **T5.4** Integrate into grocery EOD page
- [ ] **T5.5** Integrate into hardware EOD page

---

### Phase 6 — Backward Compatibility & Rent Handoff
**Estimated effort: 0.5 day**

- [ ] **T6.1** In each EOD page: conditionally show/hide `EodRentTransferSection`
  - Show old section only if: `BusinessRentConfig.autoTransferOnEOD = true` AND business has **no** active auto-deposit configs
  - If auto-deposit configs exist (including rent), hide the old section entirely
- [ ] **T6.2** In `auto-deposit-eod-summary.tsx`: rent entry minimum enforcement
  - Minimum = `BusinessRentConfig.dailyTransferAmount` (fetched from `eod-preview`)
  - Show `↑ min $X.XX` hint next to rent amount input

---

### Phase 7 — Testing & Validation
**Estimated effort: 1 day**

- [ ] **T7.1** Test setup UI: add, edit, delete configs; verify permission gating
- [ ] **T7.2** Test EOD flow with:
  - No configs (no modal shown)
  - Only rent config (rent row, no skip)
  - Mixed configs (rent + 2 others)
  - Insufficient deposit account balance (all blocked)
  - Over-sales guardrail (total > sales)
  - Rent override below minimum (rejected)
  - User skips all non-rent entries
  - Successful confirm → verify deposit ledger entries and balance
- [ ] **T7.3** Test all 4 business types
- [ ] **T7.4** Test permission: user without `canManageAutoDeposits` cannot access setup page/API
- [ ] **T7.5** Test backward compat: business with rent config but no auto-deposit configs still shows old rent transfer section

---

## Delivery Order

```
Phase 0 (Schema) → Phase 1 (Permission) → Phase 2 (CRUD API) → Phase 3 (EOD API)
      ↓
Phase 4 (Setup UI)    [can be parallel with Phase 5]
      ↓
Phase 5 (EOD Component + 4x integration)
      ↓
Phase 6 (Backward compat) → Phase 7 (Testing)
```

**Total estimated effort: ~7 development days**

---

## Decisions Record

| # | Decision |
|---|----------|
| D1 | **Deposit account source:** `Businesses.balance` — each business has one primary deposit account |
| D2 | **Sales guardrail:** Net confirmed sales only — voided/refunded transactions excluded |
| D3 | **Skip logging:** Only processed (non-skipped) deposits are logged via `ExpenseAccountDeposits` |
| D4 | **EOD permission:** `canMakeExpenseDeposits` is sufficient — no new EOD-close permission needed |
| D5 | **Max configs:** 10 entries per business (enforced server-side and in UI) |

---

*Implementation approved. Begin with Phase 0.*
