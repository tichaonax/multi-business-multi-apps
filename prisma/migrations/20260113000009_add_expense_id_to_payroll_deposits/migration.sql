-- Migration: Add expenseId column to payroll_account_deposits
-- Created: 2026-01-13
-- Purpose: Add expenseId reference to link deposits to expense transactions
-- Expected Impact: Allows backup system to query payroll_account_deposits.expenseId

-- Add expenseId column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payroll_account_deposits'
        AND column_name = 'expenseId'
    ) THEN
        ALTER TABLE "payroll_account_deposits" ADD COLUMN "expenseId" TEXT;
    END IF;
END $$;
