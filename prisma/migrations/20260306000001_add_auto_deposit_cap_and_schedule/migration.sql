-- Migration: 20260306000001_add_auto_deposit_cap_and_schedule
-- Adds deposit cap (shared/account-level), freeze flag, and per-config scheduling
-- to the EOD auto-deposit system.

-- ─── expense_accounts: cap + freeze fields ──────────────────────────────────

ALTER TABLE "expense_accounts"
  ADD COLUMN "deposit_cap"           DECIMAL(12,2)  DEFAULT NULL,
  ADD COLUMN "deposit_cap_set_by"    TEXT           DEFAULT NULL,
  ADD COLUMN "deposit_cap_set_at"    TIMESTAMPTZ    DEFAULT NULL,
  ADD COLUMN "deposit_cap_reached_at" TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN "is_auto_deposit_frozen" BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN "auto_deposit_frozen_by" TEXT          DEFAULT NULL,
  ADD COLUMN "auto_deposit_frozen_at" TIMESTAMPTZ   DEFAULT NULL;

-- FK: deposit_cap_set_by → users
ALTER TABLE "expense_accounts"
  ADD CONSTRAINT "expense_accounts_deposit_cap_set_by_fkey"
  FOREIGN KEY ("deposit_cap_set_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: auto_deposit_frozen_by → users
ALTER TABLE "expense_accounts"
  ADD CONSTRAINT "expense_accounts_auto_deposit_frozen_by_fkey"
  FOREIGN KEY ("auto_deposit_frozen_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for frozen accounts (quick filter in process-eod)
CREATE INDEX "idx_expense_accounts_frozen" ON "expense_accounts"("is_auto_deposit_frozen");

-- NOTE: expense_account_auto_deposits columns (is_paused_by_cap, start_date, end_date)
-- are defined in migration 20260310000001_add_expense_account_auto_deposits (CREATE TABLE)
