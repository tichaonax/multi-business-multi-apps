-- Free-form, one-time payee on a receipt — no Person/Business/Supplier record
-- required, e.g. an unknown/one-off vendor for a single purchase.
ALTER TABLE "expense_payment_receipts" ADD COLUMN "payee_name" TEXT;
