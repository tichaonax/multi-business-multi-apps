-- MBM-300: Batch Inventory Import (Container/Shipment Batches)
-- Additive only: 2 new tables, 3 new nullable columns on barcode_inventory_items.
-- Hand-written (not via `prisma migrate dev`) because this dev database has
-- accumulated drift against the migrations history that would otherwise
-- trigger a destructive schema reset — see project convention in memory.

-- CreateTable
CREATE TABLE "inventory_import_batches" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceFileHash" TEXT NOT NULL,
    "sourceBatchTitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "totalRowsInFile" INTEGER NOT NULL,
    "includedItemCount" INTEGER NOT NULL DEFAULT 0,
    "excludedItemCount" INTEGER NOT NULL DEFAULT 0,
    "totalLandedCost" DECIMAL(12,2),
    "totalProjectedSelling" DECIMAL(12,2),
    "totalProjectedProfit" DECIMAL(12,2),
    "importedById" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_import_items" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "isLineItem" BOOLEAN NOT NULL,
    "trackingNumber" TEXT,
    "orderNumber" TEXT,
    "parcelSuffix" TEXT,
    "productName" TEXT NOT NULL,
    "imageId" TEXT,
    "unitCost" DECIMAL(10,2),
    "clearancePerUnit" DECIMAL(10,2),
    "shippingPerUnit" DECIMAL(10,2),
    "landedCost" DECIMAL(10,2),
    "estSellingPrice" DECIMAL(10,2),
    "estMarginPct" TEXT,
    "orderedQty" INTEGER,
    "batchQty" INTEGER,
    "diffQty" INTEGER,
    "cbm" DECIMAL(10,3),
    "weightKg" DECIMAL(10,2),
    "matchStatus" TEXT,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "excludeReason" TEXT,
    "duplicateWarning" TEXT,
    "createdInventoryItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_import_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "barcode_inventory_items" ADD COLUMN "importBatchId" TEXT,
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "orderNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "inventory_import_batches_businessId_name_key" ON "inventory_import_batches"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_import_batches_businessId_sourceFileHash_key" ON "inventory_import_batches"("businessId", "sourceFileHash");

-- CreateIndex
CREATE INDEX "inventory_import_items_importBatchId_idx" ON "inventory_import_items"("importBatchId");

-- CreateIndex
CREATE INDEX "inventory_import_items_trackingNumber_idx" ON "inventory_import_items"("trackingNumber");

-- CreateIndex
CREATE INDEX "inventory_import_items_orderNumber_idx" ON "inventory_import_items"("orderNumber");

-- CreateIndex
CREATE INDEX "barcode_inventory_items_trackingNumber_idx" ON "barcode_inventory_items"("trackingNumber");

-- CreateIndex
CREATE INDEX "barcode_inventory_items_orderNumber_idx" ON "barcode_inventory_items"("orderNumber");

-- AddForeignKey
ALTER TABLE "inventory_import_batches" ADD CONSTRAINT "inventory_import_batches_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_import_batches" ADD CONSTRAINT "inventory_import_batches_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_import_items" ADD CONSTRAINT "inventory_import_items_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "inventory_import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_import_items" ADD CONSTRAINT "inventory_import_items_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_import_items" ADD CONSTRAINT "inventory_import_items_createdInventoryItemId_fkey" FOREIGN KEY ("createdInventoryItemId") REFERENCES "barcode_inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_inventory_items" ADD CONSTRAINT "barcode_inventory_items_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "inventory_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
