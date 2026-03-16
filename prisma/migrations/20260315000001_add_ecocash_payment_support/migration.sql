-- MBM-150: EcoCash Payment Support
-- Migration: add_ecocash_payment_support

-- 1. Add EcoCash fee configuration to businesses
ALTER TABLE "businesses" ADD COLUMN "ecocash_fee_type" VARCHAR(10) DEFAULT 'FIXED';
ALTER TABLE "businesses" ADD COLUMN "ecocash_fee_value" DECIMAL(10,2) DEFAULT 0.00;

-- 2. Add ECOCASH to PaymentMethod enum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ECOCASH';

-- 3. Add payment channel to cash_bucket_entries
ALTER TABLE "cash_bucket_entries" ADD COLUMN "payment_channel" VARCHAR(10) NOT NULL DEFAULT 'CASH';

-- 4. Add payment channel and EcoCash transaction code to expense_account_payments
ALTER TABLE "expense_account_payments" ADD COLUMN "payment_channel" VARCHAR(10) NOT NULL DEFAULT 'CASH';
ALTER TABLE "expense_account_payments" ADD COLUMN "ecocash_transaction_code" VARCHAR(100);

-- 5. Add payment channel and EcoCash transaction code to petty_cash_requests
ALTER TABLE "petty_cash_requests" ADD COLUMN "payment_channel" VARCHAR(10) NOT NULL DEFAULT 'CASH';
ALTER TABLE "petty_cash_requests" ADD COLUMN "ecocash_transaction_code" VARCHAR(100);
