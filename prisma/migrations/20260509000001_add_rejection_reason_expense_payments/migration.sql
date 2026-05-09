-- AlterTable: Add rejection_reason column to expense_account_payments
ALTER TABLE "expense_account_payments" ADD COLUMN "rejection_reason" TEXT;
