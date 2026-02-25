-- Add taxAmount to supplier_payment_request_items
ALTER TABLE "supplier_payment_request_items" ADD COLUMN "taxAmount" DECIMAL(12,2);
