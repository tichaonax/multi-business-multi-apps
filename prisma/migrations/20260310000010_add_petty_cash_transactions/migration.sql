-- Add spentAmount to petty_cash_requests
ALTER TABLE "petty_cash_requests"
  ADD COLUMN "spentAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Create petty_cash_transactions table
CREATE TABLE "petty_cash_transactions" (
  "id"               TEXT NOT NULL,
  "requestId"        TEXT NOT NULL,
  "businessId"       TEXT NOT NULL,
  "expenseAccountId" TEXT NOT NULL,
  "amount"           DECIMAL(12,2) NOT NULL,
  "description"      TEXT NOT NULL,
  "categoryId"       TEXT,
  "payeeType"        TEXT NOT NULL DEFAULT 'NONE',
  "payeeSupplierId"  TEXT,
  "payeeEmployeeId"  TEXT,
  "payeeUserId"      TEXT,
  "transactionDate"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paymentId"        TEXT,
  "createdBy"        TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "petty_cash_transactions_pkey" PRIMARY KEY ("id")
);

-- Unique index: one ExpenseAccountPayment per transaction
CREATE UNIQUE INDEX "petty_cash_transactions_paymentId_key"
  ON "petty_cash_transactions"("paymentId");

-- Indexes
CREATE INDEX "petty_cash_transactions_requestId_idx"
  ON "petty_cash_transactions"("requestId");

CREATE INDEX "petty_cash_transactions_businessId_idx"
  ON "petty_cash_transactions"("businessId");

-- Foreign keys
ALTER TABLE "petty_cash_transactions"
  ADD CONSTRAINT "petty_cash_transactions_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "petty_cash_requests"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "petty_cash_transactions"
  ADD CONSTRAINT "petty_cash_transactions_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "petty_cash_transactions"
  ADD CONSTRAINT "petty_cash_transactions_expenseAccountId_fkey"
  FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "petty_cash_transactions"
  ADD CONSTRAINT "petty_cash_transactions_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "petty_cash_transactions"
  ADD CONSTRAINT "petty_cash_transactions_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "expense_account_payments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "petty_cash_transactions"
  ADD CONSTRAINT "petty_cash_transactions_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
