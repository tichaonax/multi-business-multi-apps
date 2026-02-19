-- Migration: Add PersonalDepositSources table and depositSourceId to deposits

-- Step 1: Create personal_deposit_sources table
CREATE TABLE IF NOT EXISTS personal_deposit_sources (
  id              TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  name            TEXT NOT NULL,
  emoji           TEXT NOT NULL DEFAULT '💰',
  "isDefault"     BOOLEAN NOT NULL DEFAULT false,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "isUserCreated" BOOLEAN NOT NULL DEFAULT false,
  "createdBy"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT personal_deposit_sources_pkey PRIMARY KEY (id)
);

-- Step 2: Add depositSourceId to expense_account_deposits
ALTER TABLE expense_account_deposits
  ADD COLUMN IF NOT EXISTS "depositSourceId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_deposit_source'
  ) THEN
    ALTER TABLE expense_account_deposits
      ADD CONSTRAINT fk_deposit_source
      FOREIGN KEY ("depositSourceId") REFERENCES personal_deposit_sources(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Seed default deposit sources
INSERT INTO personal_deposit_sources (id, name, emoji, "isDefault", "isUserCreated", "createdAt")
VALUES
  ('depsrc_salary',     'Salary',            '💵', true, false, NOW()),
  ('depsrc_wages',      'Wages',             '💰', true, false, NOW()),
  ('depsrc_gift',       'Gift',              '🎁', true, false, NOW()),
  ('depsrc_bank_loan',  'Bank Loan',         '🏦', true, false, NOW()),
  ('depsrc_pers_loan',  'Personal Loan',     '👤', true, false, NOW()),
  ('depsrc_transfer',   'Transfer',          '🔄', true, false, NOW()),
  ('depsrc_investment', 'Investment Return', '💫', true, false, NOW()),
  ('depsrc_other',      'Other',             '🙉', true, false, NOW())
ON CONFLICT (id) DO NOTHING;
