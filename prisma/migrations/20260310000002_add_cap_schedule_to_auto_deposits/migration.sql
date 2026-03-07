-- Migration: 20260310000002_add_cap_schedule_to_auto_deposits
-- Adds schedule (start_date, end_date) and cap-pause flag to
-- expense_account_auto_deposits. Runs after table creation (20260310000001).
-- Uses IF NOT EXISTS so it is safe to re-apply on databases where these
-- columns were added manually or via an earlier migration attempt.

ALTER TABLE "expense_account_auto_deposits"
  ADD COLUMN IF NOT EXISTS "is_paused_by_cap" BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "start_date"       DATE     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "end_date"         DATE     DEFAULT NULL;

-- Indexes for date-range queries and cap-paused filtering in process-eod
CREATE INDEX IF NOT EXISTS "idx_auto_deposits_start_date"  ON "expense_account_auto_deposits"("start_date");
CREATE INDEX IF NOT EXISTS "idx_auto_deposits_end_date"    ON "expense_account_auto_deposits"("end_date");
CREATE INDEX IF NOT EXISTS "idx_auto_deposits_paused_cap"  ON "expense_account_auto_deposits"("is_paused_by_cap");
