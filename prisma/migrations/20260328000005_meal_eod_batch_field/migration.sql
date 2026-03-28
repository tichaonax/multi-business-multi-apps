-- MBM-167: Add eod_meal_batch_id to expense_account_payments
-- Links individual MEAL_PROGRAM payments to their consolidated MEAL_BATCH record

ALTER TABLE "expense_account_payments"
  ADD COLUMN IF NOT EXISTS "eod_meal_batch_id" TEXT;

CREATE INDEX IF NOT EXISTS "idx_expense_payments_eod_meal_batch"
  ON "expense_account_payments"("eod_meal_batch_id");
