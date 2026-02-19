-- Migration: Add ExpenseAccountLoans and loan-related fields

-- Step 1: Create expense_account_loans table
CREATE TABLE IF NOT EXISTS expense_account_loans (
  id                 TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "loanNumber"       TEXT NOT NULL,
  "expenseAccountId" TEXT NOT NULL,
  "lenderId"         TEXT NOT NULL,
  "principalAmount"  DECIMAL(12,2) NOT NULL,
  "remainingBalance" DECIMAL(12,2) NOT NULL,
  "loanDate"         TIMESTAMP(3) NOT NULL,
  "dueDate"          TIMESTAMP(3),
  status             TEXT NOT NULL DEFAULT 'ACTIVE',
  notes              TEXT,
  "depositId"        TEXT,
  "createdBy"        TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT expense_account_loans_pkey PRIMARY KEY (id),
  CONSTRAINT expense_account_loans_loanNumber_key UNIQUE ("loanNumber"),
  CONSTRAINT fk_loan_expense_account FOREIGN KEY ("expenseAccountId") REFERENCES expense_accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_loan_lender FOREIGN KEY ("lenderId") REFERENCES expense_account_lenders(id)
);

CREATE INDEX IF NOT EXISTS idx_expense_loans_account ON expense_account_loans ("expenseAccountId");
CREATE INDEX IF NOT EXISTS idx_expense_loans_status ON expense_account_loans (status);

-- Step 2: Add paymentType, loanId, interestAmount to expense_account_payments
ALTER TABLE expense_account_payments
  ADD COLUMN IF NOT EXISTS "paymentType"   TEXT NOT NULL DEFAULT 'REGULAR',
  ADD COLUMN IF NOT EXISTS "loanId"        TEXT,
  ADD COLUMN IF NOT EXISTS "interestAmount" DECIMAL(12,2);

-- Step 3: Add loanId to expense_account_deposits
ALTER TABLE expense_account_deposits
  ADD COLUMN IF NOT EXISTS "loanId" TEXT;
