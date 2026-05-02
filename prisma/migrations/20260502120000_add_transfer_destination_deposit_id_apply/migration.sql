-- Add destination_deposit_id to expense_account_payments
-- Links a TRANSFER_OUT payment to the ACCOUNT_TRANSFER deposit it created on the receiving account.
-- Enables bidirectional navigation between transfer pairs.

ALTER TABLE "expense_account_payments"
  ADD COLUMN IF NOT EXISTS "destination_deposit_id" TEXT;

ALTER TABLE "expense_account_payments"
  DROP CONSTRAINT IF EXISTS "expense_account_payments_destination_deposit_id_key";

ALTER TABLE "expense_account_payments"
  ADD CONSTRAINT "expense_account_payments_destination_deposit_id_key" UNIQUE ("destination_deposit_id");
