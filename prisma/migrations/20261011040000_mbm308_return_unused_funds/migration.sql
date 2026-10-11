-- MBM-308: Return Unused Expense Funds
-- Requester-initiated return of unused expense funds, cashier-confirmed,
-- across standalone/advance payments and petty cash (CASH channel).

ALTER TABLE "expense_account_payments"
  ADD COLUMN "return_requested_amount" DECIMAL(12,2),
  ADD COLUMN "return_requested_at" TIMESTAMP(3),
  ADD COLUMN "return_requested_by" TEXT,
  ADD COLUMN "return_note" TEXT,
  ADD COLUMN "return_confirmed_at" TIMESTAMP(3),
  ADD COLUMN "return_confirmed_by" TEXT,
  ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "petty_cash_requests"
  ADD COLUMN "returnRequestedAt" TIMESTAMP(3),
  ADD COLUMN "returnRequestedBy" TEXT;

ALTER TYPE "PettyCashStatus" ADD VALUE 'SETTLE_REQUESTED';
