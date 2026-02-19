-- Make categoryId nullable on expense_account_payments
-- Loan repayments and transfer returns are already classified by paymentType
-- so requiring a category is unnecessary friction.

DO $$ BEGIN
  ALTER TABLE "expense_account_payments" ALTER COLUMN "categoryId" DROP NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;
