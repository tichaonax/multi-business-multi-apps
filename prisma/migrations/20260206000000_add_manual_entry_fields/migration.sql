-- AlterTable: Add manual entry fields to business_orders
ALTER TABLE "business_orders" ADD COLUMN IF NOT EXISTS "transactionDate" TIMESTAMP(3);
ALTER TABLE "business_orders" ADD COLUMN IF NOT EXISTS "isManualEntry" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business_orders" ADD COLUMN IF NOT EXISTS "manualEntryNote" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "business_orders_businessId_transactionDate_idx" ON "business_orders"("businessId", "transactionDate");
