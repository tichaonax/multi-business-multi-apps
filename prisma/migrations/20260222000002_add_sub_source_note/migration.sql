-- Add subSourceNote to expense_account_deposits
-- Stores a one-off courier/delivery name when no saved fund source is selected
ALTER TABLE "expense_account_deposits" ADD COLUMN "subSourceNote" TEXT;
