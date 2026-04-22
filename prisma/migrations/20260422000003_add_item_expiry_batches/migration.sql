-- CreateTable
CREATE TABLE "item_expiry_batches" (
    "id"              TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "businessId"      TEXT NOT NULL,
    "quantity"        INTEGER NOT NULL,
    "expiryDate"      TIMESTAMP(3),
    "receivedDate"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batchNote"       TEXT,
    "isResolved"      BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt"      TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy"       TEXT NOT NULL,

    CONSTRAINT "item_expiry_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_expiry_batches_inventoryItemId_idx" ON "item_expiry_batches"("inventoryItemId");

-- CreateIndex
CREATE INDEX "item_expiry_batches_businessId_idx" ON "item_expiry_batches"("businessId");

-- CreateIndex
CREATE INDEX "item_expiry_batches_expiryDate_idx" ON "item_expiry_batches"("expiryDate");

-- AddForeignKey
ALTER TABLE "item_expiry_batches" ADD CONSTRAINT "item_expiry_batches_inventoryItemId_fkey"
    FOREIGN KEY ("inventoryItemId") REFERENCES "barcode_inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
