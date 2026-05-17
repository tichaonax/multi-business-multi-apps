-- AlterTable: add EcoCash fee and transaction code to r710_token_sales
ALTER TABLE "r710_token_sales"
  ADD COLUMN "ecocash_fee_amount" DECIMAL(12,2),
  ADD COLUMN "ecocash_transaction_code" VARCHAR(100);
