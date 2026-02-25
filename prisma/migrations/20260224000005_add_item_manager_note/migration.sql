-- Add manager note to individual line items (used when payment amount is adjusted)
ALTER TABLE "supplier_payment_request_items" ADD COLUMN "managerNote" TEXT;
