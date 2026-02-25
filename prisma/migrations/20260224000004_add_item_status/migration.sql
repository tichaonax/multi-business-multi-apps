-- Add per-item status tracking to supplier_payment_request_items
ALTER TABLE "supplier_payment_request_items" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
