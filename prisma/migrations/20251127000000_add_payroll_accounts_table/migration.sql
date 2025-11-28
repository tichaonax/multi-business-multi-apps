-- CreateTable: Payroll Accounts System
-- This migration adds the payroll accounts management system
-- Idempotent: Works for both fresh installs and upgrades

-- Create payroll_accounts table
CREATE TABLE IF NOT EXISTS "payroll_accounts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "accountNumber" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "payroll_accounts_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_accounts_businessId_key" ON "payroll_accounts"("businessId");
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_accounts_accountNumber_key" ON "payroll_accounts"("accountNumber");

-- Create indexes for payroll_accounts
CREATE INDEX IF NOT EXISTS "payroll_accounts_businessId_idx" ON "payroll_accounts"("businessId");

-- Add foreign key constraints (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_accounts_businessId_fkey') THEN
        ALTER TABLE "payroll_accounts" ADD CONSTRAINT "payroll_accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_accounts_createdBy_fkey') THEN
        ALTER TABLE "payroll_accounts" ADD CONSTRAINT "payroll_accounts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END$$;