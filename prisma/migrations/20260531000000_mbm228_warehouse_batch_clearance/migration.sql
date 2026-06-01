-- MBM-228: Add source batch metadata and clearance cost to warehouse_items
ALTER TABLE "warehouse_items"
  ADD COLUMN "sourceBatchId"     INTEGER,
  ADD COLUMN "sourceBatchName"   TEXT,
  ADD COLUMN "sourceBatchStatus" TEXT,
  ADD COLUMN "clearanceCostUsd"  DECIMAL(10, 4);
