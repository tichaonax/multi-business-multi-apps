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

-- ─── expense_account_auto_deposits: schedule + cap-pause fields ──────────────

ALTER TABLE "expense_account_auto_deposits"
  ADD COLUMN "is_paused_by_cap" BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN "start_date"       DATE     DEFAULT NULL,
  ADD COLUMN "end_date"         DATE     DEFAULT NULL;

-- Index for date-range queries in process-eod
CREATE INDEX "idx_auto_deposits_start_date" ON "expense_account_auto_deposits"("start_date");
CREATE INDEX "idx_auto_deposits_end_date"   ON "expense_account_auto_deposits"("end_date");
CREATE INDEX "idx_auto_deposits_paused_cap" ON "expense_account_auto_deposits"("is_paused_by_cap");
