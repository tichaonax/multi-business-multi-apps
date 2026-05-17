-- Make businessId nullable on expense_payment_vouchers
-- Standalone/personal expense accounts have no linked business,
-- so vouchers created for those payments must not require a businessId.

ALTER TABLE "expense_payment_vouchers" ALTER COLUMN "business_id" DROP NOT NULL;

-- Drop the composite unique constraint (businessId, voucherNumber).
-- Voucher numbers are now unique per-payment (already enforced by the @unique on paymentId).
DROP INDEX IF EXISTS "expense_payment_vouchers_business_id_voucher_number_key";
