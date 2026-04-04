-- Migration: Add income categorization columns to expense_account_deposits
-- Adds incomeDomainId, incomeCategoryId, incomeSubcategoryId (all nullable)
-- These store the income classification when a deposit is created from personal or business income

ALTER TABLE expense_account_deposits
  ADD COLUMN IF NOT EXISTS "incomeDomainId" TEXT,
  ADD COLUMN IF NOT EXISTS "incomeCategoryId" TEXT,
  ADD COLUMN IF NOT EXISTS "incomeSubcategoryId" TEXT;

CREATE INDEX IF NOT EXISTS "idx_deposits_income_category" ON expense_account_deposits ("incomeCategoryId");
