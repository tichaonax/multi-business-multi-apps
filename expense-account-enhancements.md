# Expense Account Enhancements: Personal Categories, Loans & Transfers

## Overview
Six focused phases covering personal categories, optional payees, deposit sources, lender/loan tracking, and inter-account business transfers.

---

## Existing Infrastructure (Reuse)
- `ExpenseCategories` + `ExpenseDomains` — domain-scoped categories already modelled
- `ExpenseAccountDeposits.sourceType` — already "BUSINESS" | "MANUAL" | "OTHER"
- `PayeeSelector` — supports USER, EMPLOYEE, PERSON, BUSINESS, SUPPLIER
- `InterBusinessLoans` / `src/app/business/manage/lenders` — **business-to-business** loans (separate system, do NOT repurpose)
- `src/lib/date-utils` `getTodayLocalDateString()` — use for date inputs
- `formatCurrency()` from `expense-account-utils.ts` — use for all money display

---

## Phase 1 — Personal Expense Categories (Migration Only)

### What
Add a "Personal" `ExpenseDomain` and seed the 19 categories under it.
Uses `INSERT ... WHERE NOT EXISTS` so safe to run on production.

### Categories to Add
| Emoji | Name | Notes |
|-------|------|-------|
| 🏡 | Rent | |
| 🥝 | Grocery | |
| 🍔 | Dining | |
| 🚘 | Transportation | (may overlap flat `exp_flat_transportation` — keep both, different domain) |
| 🛍 | Shopping | |
| 📚 | Loan | |
| 🐶 | Pet | |
| ⚡️ | Utility | |
| 💫 | Personal | |
| 🧷 | Insurance | |
| 📞 | Phone | |
| 💪 | Gym | |
| 🧘‍♂️ | Wellness | |
| ✈️ | Travel | |
| 🏡 | Home Goods | |
| 👩‍⚕️ | Medical | |
| 🎗 | Giving | |
| 🍿 | Entertainment | |
| 💵 | Interest | |
| 🙉 | Other | |

### Migration
`add_personal_expense_categories`
- Insert `personal` domain into `expense_domains` (IF NOT EXISTS)
- Insert each category into `expense_categories` with `domainId = personal_domain_id` (ON CONFLICT DO NOTHING)

### Todo
- [ ] 1.1 Create migration SQL for Personal domain + 20 categories
- [ ] 1.2 Run `prisma migrate deploy`
- [ ] 1.3 Verify categories load in PaymentForm for PERSONAL accounts

---

## Phase 2 — Optional Payee for Personal Accounts

### What
For personal expense accounts, payee selection is optional. When skipped the payment records `payeeType = "NONE"`.
No DB migration needed — `payeeType` is already a `String` column.

### Changes
| File | Change |
|------|--------|
| `src/app/api/expense-account/[accountId]/payments/route.ts` | Accept `"NONE"` as valid `payeeType`; skip payee validation when NONE |
| `src/components/expense-account/payment-form.tsx` | For PERSONAL accounts: add "No specific payee" toggle above PayeeSelector; when toggled, clear payee and skip validation |
| `src/components/expense-account/quick-payment-modal.tsx` | Same toggle |
| `src/components/expense-account/transaction-history.tsx` | Show "—" or "General" when payeeType is NONE |

### Todo
- [ ] 2.1 Update payments API to accept `payeeType = "NONE"`
- [ ] 2.2 Update PaymentForm — add "No specific payee" option for PERSONAL accounts
- [ ] 2.3 Update QuickPaymentModal — same
- [ ] 2.4 Update TransactionHistory — display gracefully when no payee

---

## Phase 3 — Deposit Sources for Personal Accounts

### What
Track the funding source for deposits (Salary, Wages, Gift, etc.). Applies to personal accounts. Comes with seeded defaults + ability to add custom sources.

### New Model
```prisma
model PersonalDepositSources {
  id            String   @id @default(uuid())
  name          String
  emoji         String   @default("💰")
  isDefault     Boolean  @default(false)
  isActive      Boolean  @default(true)
  isUserCreated Boolean  @default(false)
  createdBy     String?
  createdAt     DateTime @default(now())

  @@map("personal_deposit_sources")
}
```

### Default Seeds
| Emoji | Name |
|-------|------|
| 💵 | Salary |
| 💰 | Wages |
| 🎁 | Gift |
| 🏦 | Bank Loan |
| 👤 | Personal Loan |
| 🔄 | Transfer |
| 💫 | Investment Return |
| 🙉 | Other |

### Schema Change to ExpenseAccountDeposits
Add optional FK:
```prisma
depositSourceId  String?  // FK to personal_deposit_sources
```

### Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `PersonalDepositSources` model; add `depositSourceId` to `ExpenseAccountDeposits` |
| `src/app/api/expense-account/deposit-sources/route.ts` | **New** GET (list) + POST (create custom) |
| `src/app/api/expense-account/[accountId]/deposits/route.ts` | Accept optional `depositSourceId` |
| `src/components/expense-account/deposit-form.tsx` | For PERSONAL accounts: show Deposit Source selector below amount; "＋ Add Source" link |
| `src/components/expense-account/transaction-history.tsx` | Show deposit source name in deposit rows |

### Migration
`add_personal_deposit_sources`

### Todo
- [ ] 3.1 Schema: add `PersonalDepositSources` + `depositSourceId` on deposits
- [ ] 3.2 Migration: create table + seed defaults
- [ ] 3.3 API: `GET/POST /api/expense-account/deposit-sources`
- [ ] 3.4 Deposits API: accept `depositSourceId`
- [ ] 3.5 DepositForm: source selector for PERSONAL accounts
- [ ] 3.6 TransactionHistory: show source name in deposit rows

---

## Phase 4 — Lender Management

### What
Standalone lender directory (banks and individuals) that can be reused by both personal and general accounts for loan deposits. Separate from the existing `business/manage/lenders` (inter-business loans — do not touch).

### New Model
```prisma
model ExpenseAccountLenders {
  id          String   @id @default(uuid())
  name        String
  lenderType  String   @default("BANK")  // "BANK" | "INDIVIDUAL" | "OTHER"
  phone       String?
  email       String?
  notes       String?
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  isUserCreated Boolean @default(false)
  createdBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  loans ExpenseAccountLoans[]

  @@map("expense_account_lenders")
}
```

### Default Seeds
| Emoji | Name | Type |
|-------|------|------|
| 🏦 | Local Bank | BANK |
| 🏦 | Commercial Bank | BANK |
| 👤 | Family Member | INDIVIDUAL |
| 👤 | Friend | INDIVIDUAL |
| 🙉 | Other | OTHER |

### Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `ExpenseAccountLenders` model |
| `src/app/api/expense-account/lenders/route.ts` | **New** GET (list) + POST (create) |
| `src/app/api/expense-account/lenders/[lenderId]/route.ts` | **New** PATCH (update) |
| `src/components/expense-account/lender-selector.tsx` | **New** — dropdown with "+ Add Lender" inline |
| `src/app/expense-accounts/lenders/page.tsx` | **New** — full lender management list page |
| Sidebar | Add "Lenders" link under Finance & Operations |

### Migration
`add_expense_account_lenders`

### Todo
- [ ] 4.1 Schema: add `ExpenseAccountLenders`
- [ ] 4.2 Migration: create table + seed defaults
- [ ] 4.3 API: GET/POST lenders + PATCH lender
- [ ] 4.4 LenderSelector component (with inline create)
- [ ] 4.5 Lenders management page
- [ ] 4.6 Add Lenders to sidebar

---

## Phase 5 — Loan Tracking & Repayments

### What
When a deposit is of type LOAN, link it to a lender and create a loan record tracking the outstanding balance. Repayments are regular payments with `paymentType = "LOAN_REPAYMENT"`, capturing principal and optional interest amount. Both PERSONAL and GENERAL accounts supported.

### New Model
```prisma
model ExpenseAccountLoans {
  id               String   @id @default(uuid())
  loanNumber       String   @unique
  expenseAccountId String
  lenderId         String
  principalAmount  Decimal  @db.Decimal(12, 2)
  remainingBalance Decimal  @db.Decimal(12, 2)
  loanDate         DateTime
  dueDate          DateTime?
  status           String   @default("ACTIVE")  // "ACTIVE" | "PAID_OFF" | "WRITTEN_OFF"
  notes            String?
  depositId        String?  // FK to ExpenseAccountDeposits (the originating deposit)
  createdBy        String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  expenseAccount ExpenseAccounts        @relation(...)
  lender         ExpenseAccountLenders  @relation(...)
  repayments     ExpenseAccountPayments[] @relation("LoanRepayments")

  @@map("expense_account_loans")
}
```

### Schema Changes to ExpenseAccountPayments
Add:
```prisma
paymentType     String   @default("REGULAR")  // "REGULAR" | "LOAN_REPAYMENT" | "TRANSFER_RETURN"
loanId          String?  // FK to ExpenseAccountLoans (for LOAN_REPAYMENT)
interestAmount  Decimal? @db.Decimal(12, 2)   // additional interest charged at repayment time
```

### Schema Changes to ExpenseAccountDeposits
Add:
```prisma
loanId  String?  // FK to ExpenseAccountLoans (set when sourceType = "LOAN")
```

### Loan Repayment Logic
- `principalPortion = paymentAmount - interestAmount`
- `loan.remainingBalance -= principalPortion`
- `interestAmount` is tracked separately (does NOT reduce loan balance — it's an extra cost)
- When `remainingBalance <= 0` → set `loan.status = "PAID_OFF"`

### Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `ExpenseAccountLoans`; add `paymentType`, `loanId`, `interestAmount` to payments; add `loanId` to deposits |
| `src/app/api/expense-account/[accountId]/deposits/route.ts` | When `sourceType = "LOAN"`: require `lenderId`; create `ExpenseAccountLoans` record; link `loanId` on deposit |
| `src/app/api/expense-account/[accountId]/payments/route.ts` | When `paymentType = "LOAN_REPAYMENT"`: require `loanId` + `interestAmount`; update loan remaining balance; mark PAID_OFF if balance reaches 0 |
| `src/app/api/expense-account/[accountId]/loans/route.ts` | **New** GET — list loans for this account with balance + lender info |
| `src/components/expense-account/deposit-form.tsx` | When source type = LOAN: show `LenderSelector` + loan details (optional due date, notes) |
| `src/components/expense-account/payment-form.tsx` | Payment type selector (REGULAR default); when LOAN_REPAYMENT: show loan selector, interest amount field (default 0) |
| `src/components/expense-account/quick-payment-modal.tsx` | Same payment type selector |
| `src/app/expense-accounts/[accountId]/page.tsx` | Add "Loans" tab showing active loans + repayment history |
| `src/components/expense-account/loans-tab.tsx` | **New** — loans list with balance, lender, repayment history per loan |

### Migration
`add_expense_account_loans`

### Todo
- [ ] 5.1 Schema: add `ExpenseAccountLoans`; add fields to payments + deposits
- [ ] 5.2 Migration
- [ ] 5.3 Deposits API: LOAN source type creates loan record
- [ ] 5.4 Payments API: LOAN_REPAYMENT type updates loan balance
- [ ] 5.5 Loans API: GET loans per account
- [ ] 5.6 DepositForm: LOAN source flow (lender selector, due date)
- [ ] 5.7 PaymentForm + QuickPaymentModal: payment type selector + loan repayment flow
- [ ] 5.8 Loans tab on account detail page

---

## Phase 6 — Business Transfer Tracking

### What
When a deposit comes from a different business, record it in a transfer ledger. A "Transfer Return" payment type lets the receiving account pay back what it owes, crediting the originating account. Reports show outstanding transfer imbalances.

### New Model
```prisma
model BusinessTransferLedger {
  id                   String   @id @default(uuid())
  fromAccountId        String   // account that sent money
  toAccountId          String   // account that received money
  fromBusinessId       String
  toBusinessId         String
  originalAmount       Decimal  @db.Decimal(12, 2)
  outstandingAmount    Decimal  @db.Decimal(12, 2)
  transferDate         DateTime
  depositId            String   // FK to ExpenseAccountDeposits
  status               String   @default("OUTSTANDING")  // "OUTSTANDING" | "PARTIALLY_RETURNED" | "RETURNED"
  createdBy            String
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  returnPayments ExpenseAccountPayments[] @relation("TransferReturns")

  @@map("business_transfer_ledger")
}
```

### Schema Changes to ExpenseAccountPayments
Add:
```prisma
transferLedgerId  String?  // FK to BusinessTransferLedger (for TRANSFER_RETURN)
```

### Business Transfer Logic
**On Deposit (sourceType = BUSINESS, cross-business):**
- When the depositing business differs from `expenseAccount.businessId`
- Automatically create `BusinessTransferLedger` record with `outstandingAmount = depositAmount`

**On Transfer Return Payment:**
- `paymentType = "TRANSFER_RETURN"`
- User selects target business → system shows `outstandingAmount` owed
- Validation: `paymentAmount <= outstandingAmount`
- On success: `outstandingAmount -= paymentAmount`; if 0 → `status = "RETURNED"`; credit the originating account's balance (create a deposit there)

### Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `BusinessTransferLedger`; add `transferLedgerId` to payments |
| `src/app/api/expense-account/[accountId]/deposits/route.ts` | When BUSINESS source + cross-business: auto-create `BusinessTransferLedger` record |
| `src/app/api/expense-account/[accountId]/payments/route.ts` | TRANSFER_RETURN: validate amount vs outstanding; update ledger; credit originating account |
| `src/app/api/expense-account/[accountId]/transfers/route.ts` | **New** GET — outstanding transfers owed by this account |
| `src/components/expense-account/payment-form.tsx` | TRANSFER_RETURN payment type: show business selector with outstanding amount |
| `src/app/expense-accounts/reports/transfers/page.tsx` | **New** — imbalance report: which accounts owe which businesses + amounts |

### Migration
`add_business_transfer_ledger`

### Todo
- [ ] 6.1 Schema: add `BusinessTransferLedger`; add `transferLedgerId` to payments
- [ ] 6.2 Migration
- [ ] 6.3 Deposits API: auto-create ledger record for cross-business deposits
- [ ] 6.4 Payments API: TRANSFER_RETURN flow + credit originating account
- [ ] 6.5 Transfers GET API for outstanding balances per account
- [ ] 6.6 PaymentForm: TRANSFER_RETURN type flow
- [ ] 6.7 Transfer Imbalance Report page

---

## Database Migrations Summary
| # | Name | Tables Created/Altered |
|---|------|----------------------|
| M1 | `add_personal_expense_categories` | `expense_domains` (insert), `expense_categories` (insert) |
| M2 | `add_personal_deposit_sources` | CREATE `personal_deposit_sources`; ALTER `expense_account_deposits` (add `depositSourceId`) |
| M3 | `add_expense_account_lenders` | CREATE `expense_account_lenders` |
| M4 | `add_expense_account_loans` | CREATE `expense_account_loans`; ALTER `expense_account_payments` (add `paymentType`, `loanId`, `interestAmount`); ALTER `expense_account_deposits` (add `loanId`) |
| M5 | `add_business_transfer_ledger` | CREATE `business_transfer_ledger`; ALTER `expense_account_payments` (add `transferLedgerId`) |

---

## Assumptions & Constraints
- Loans: interest is captured as a dollar amount at repayment time only (no percentage rate stored)
- Transfer returns cannot exceed outstanding transfer amount
- Optional payee (`NONE`) only available for PERSONAL accounts
- Deposit sources selector only shown for PERSONAL accounts (GENERAL uses existing BUSINESS/MANUAL/OTHER)
- Phases are independent — each can be deployed separately
- All date inputs use `getTodayLocalDateString()` from `date-utils`
- All currency display uses `formatCurrency()` from `expense-account-utils`
