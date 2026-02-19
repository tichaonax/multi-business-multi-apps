-- Add permissionLevel to expense_account_grants
-- "VIEW" = view account + reports only
-- "FULL" = view + payments + deposits (default)
ALTER TABLE "expense_account_grants"
  ADD COLUMN IF NOT EXISTS "permissionLevel" TEXT NOT NULL DEFAULT 'FULL';
