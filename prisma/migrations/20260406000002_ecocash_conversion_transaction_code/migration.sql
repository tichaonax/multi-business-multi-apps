-- Add transaction_code column to ecocash_conversions
-- Captures the eco-cash reference code entered by the cashier at completion

ALTER TABLE "ecocash_conversions" ADD COLUMN "transaction_code" TEXT;
