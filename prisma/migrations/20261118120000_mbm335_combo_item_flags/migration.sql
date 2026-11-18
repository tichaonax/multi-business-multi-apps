-- MBM-335: cashier flags on combo request items
ALTER TABLE "combo_payment_request_items"
  ADD COLUMN "flagNote" TEXT,
  ADD COLUMN "flaggedBy" TEXT,
  ADD COLUMN "flaggedAt" TIMESTAMP(3),
  ADD COLUMN "flagResolvedAt" TIMESTAMP(3),
  ADD COLUMN "flagResponse" TEXT;

ALTER TABLE "combo_payment_request_items"
  ADD CONSTRAINT "combo_payment_request_items_flaggedBy_fkey"
  FOREIGN KEY ("flaggedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
