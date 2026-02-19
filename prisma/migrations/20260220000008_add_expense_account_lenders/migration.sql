-- Migration: Add ExpenseAccountLenders table with default seeds

CREATE TABLE IF NOT EXISTS expense_account_lenders (
  id              TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  name            TEXT NOT NULL,
  "lenderType"    TEXT NOT NULL DEFAULT 'BANK',
  phone           TEXT,
  email           TEXT,
  notes           TEXT,
  "isDefault"     BOOLEAN NOT NULL DEFAULT false,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "isUserCreated" BOOLEAN NOT NULL DEFAULT false,
  "createdBy"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT expense_account_lenders_pkey PRIMARY KEY (id)
);

-- Seed default lenders
INSERT INTO expense_account_lenders (id, name, "lenderType", "isDefault", "isUserCreated", "createdAt", "updatedAt")
VALUES
  ('lender_local_bank',     'Local Bank',      'BANK',       true, false, NOW(), NOW()),
  ('lender_comm_bank',      'Commercial Bank', 'BANK',       true, false, NOW(), NOW()),
  ('lender_microfinance',   'Microfinance',    'BANK',       true, false, NOW(), NOW()),
  ('lender_family',         'Family Member',   'INDIVIDUAL', true, false, NOW(), NOW()),
  ('lender_friend',         'Friend',          'INDIVIDUAL', true, false, NOW(), NOW()),
  ('lender_other',          'Other',           'OTHER',      true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
