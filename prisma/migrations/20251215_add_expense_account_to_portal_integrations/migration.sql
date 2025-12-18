-- Migration: Add expenseAccountId to portal_integrations
-- Created: 2025-12-15
-- Purpose: Link portal integrations to expense accounts for WiFi token sales tracking
-- Expected Impact: Enables automatic expense account association for WiFi token sales

-- Add expenseAccountId column
ALTER TABLE "portal_integrations" ADD COLUMN IF NOT EXISTS "expenseAccountId" TEXT;

-- Add foreign key constraint
ALTER TABLE "portal_integrations"
  ADD CONSTRAINT "portal_integrations_expenseAccountId_fkey"
  FOREIGN KEY ("expenseAccountId")
  REFERENCES "expense_accounts"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS "portal_integrations_expenseAccountId_idx" ON "portal_integrations"("expenseAccountId");
