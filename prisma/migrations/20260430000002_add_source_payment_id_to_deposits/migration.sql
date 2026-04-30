-- Add sourcePaymentId to expense_account_deposits
-- Links a PAYMENT_ADJUSTMENT deposit back to the payment it compensates
ALTER TABLE "expense_account_deposits" ADD COLUMN "sourcePaymentId" TEXT;

ALTER TABLE "expense_account_deposits"
  ADD CONSTRAINT "expense_account_deposits_sourcePaymentId_fkey"
  FOREIGN KEY ("sourcePaymentId")
  REFERENCES "expense_account_payments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
