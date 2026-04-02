-- Add cashInLieu: for cash-in-lieu of leave, gratuities, and similar one-off payments
-- Add nssaEmployer: employer-side NSSA contribution stored per entry for reporting

ALTER TABLE "payroll_entries"
  ADD COLUMN IF NOT EXISTS "cashInLieu"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nssaEmployer"  DECIMAL(12,2) NOT NULL DEFAULT 0;
