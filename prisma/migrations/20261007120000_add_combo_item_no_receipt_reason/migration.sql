-- MBM-303: Combo Request Item-Level Receipt Reconciliation
-- Marks a planned combo item as "no receipt for this, here's why" — counts
-- as accounted for without a matching receipt total. No markedBy/markedAt:
-- the audit log entry the PATCH route writes already captures who/when.
ALTER TABLE "combo_payment_request_items" ADD COLUMN "noReceiptReason" TEXT;
