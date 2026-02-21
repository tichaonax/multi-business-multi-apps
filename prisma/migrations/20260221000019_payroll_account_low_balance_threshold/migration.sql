-- Add configurable low balance threshold to payroll_accounts
ALTER TABLE "payroll_accounts"
  ADD COLUMN "lowBalanceThreshold" DECIMAL(12,2) NOT NULL DEFAULT 500;
