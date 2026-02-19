-- Add accountType column to expense_accounts
-- GENERAL = current behaviour (all categories)
-- PERSONAL = locked to Personal category only
ALTER TABLE expense_accounts
  ADD COLUMN IF NOT EXISTS "accountType" TEXT NOT NULL DEFAULT 'GENERAL';
