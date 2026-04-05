-- MBM-171: Rejection audit trail for cashier-assisted payment requests
-- Adds rejected_by and rejected_at columns to expense_account_payments

ALTER TABLE "expense_account_payments"
  ADD COLUMN IF NOT EXISTS "rejected_by"  TEXT,
  ADD COLUMN IF NOT EXISTS "rejected_at"  TIMESTAMP(3);
