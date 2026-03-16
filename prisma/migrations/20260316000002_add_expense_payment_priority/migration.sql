-- Add priority column to expense_account_payments
ALTER TABLE "expense_account_payments" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'NORMAL';
