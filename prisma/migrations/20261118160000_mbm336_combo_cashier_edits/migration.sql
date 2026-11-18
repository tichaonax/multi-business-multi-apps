-- MBM-336: cashier corrections to a submitted combo request
ALTER TABLE "combo_payment_requests"
  ADD COLUMN "cashierEditedBy" TEXT,
  ADD COLUMN "cashierEditedAt" TIMESTAMP(3),
  ADD COLUMN "cashierChanges" TEXT;

ALTER TABLE "combo_payment_requests"
  ADD CONSTRAINT "combo_payment_requests_cashierEditedBy_fkey"
  FOREIGN KEY ("cashierEditedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
