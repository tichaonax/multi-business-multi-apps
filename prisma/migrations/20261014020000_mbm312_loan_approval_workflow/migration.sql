-- MBM-312: cashier-approval gate for BUSINESS-loan repayments.
-- Existing rows default to APPROVED since the money they represent has
-- already moved (they predate this approval gate).

ALTER TABLE "account_outgoing_loan_payments"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "account_outgoing_loan_payments"
  ADD CONSTRAINT "account_outgoing_loan_payments_approvedBy_fkey"
  FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
