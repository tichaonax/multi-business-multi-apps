-- MBM-300: Container Batch reconciliation fields on warehouse_items.
-- Additive/nullable only — existing rows are unaffected.

-- AlterTable
ALTER TABLE "warehouse_items"
  ADD COLUMN "shippingPerUnit" DECIMAL(10,2),
  ADD COLUMN "landedCost" DECIMAL(10,2),
  ADD COLUMN "estSellingPrice" DECIMAL(10,2),
  ADD COLUMN "estMarginPct" TEXT,
  ADD COLUMN "batchQty" INTEGER,
  ADD COLUMN "diffQty" INTEGER,
  ADD COLUMN "matchStatus" TEXT;

-- CreateIndex
CREATE INDEX "warehouse_items_trackingNumber_orderNumber_idx" ON "warehouse_items"("trackingNumber", "orderNumber");
