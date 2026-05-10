-- MBM-209: Loan withdrawal request — rescind, deny, and draft edit support
-- Adds three new audit columns to loan_withdrawal_requests.
-- Status column comment updated in schema (no DB change needed — it's a plain TEXT column).

ALTER TABLE "loan_withdrawal_requests"
  ADD COLUMN IF NOT EXISTS "denied_by_role" TEXT,
  ADD COLUMN IF NOT EXISTS "rescinded_by"   TEXT,
  ADD COLUMN IF NOT EXISTS "rescinded_at"   TIMESTAMPTZ;
