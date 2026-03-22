-- MBM-159: EcoCash Enhancements
-- Add ecocash_minimum_fee to businesses
ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "ecocash_minimum_fee" DECIMAL(10,2) DEFAULT 0;

-- Add confirmed_ecocash_amount to saved_reports (manager's EOD confirmed EcoCash total)
ALTER TABLE "saved_reports"
  ADD COLUMN IF NOT EXISTS "confirmed_ecocash_amount" DECIMAL(10,2);

-- Add total_ecocash_received to grouped_eod_runs (catch-up period EcoCash lump sum)
ALTER TABLE "grouped_eod_runs"
  ADD COLUMN IF NOT EXISTS "total_ecocash_received" FLOAT;
