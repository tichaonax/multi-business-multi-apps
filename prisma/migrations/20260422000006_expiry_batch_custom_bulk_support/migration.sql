-- Allow item_expiry_batches to reference either BarcodeInventoryItems OR CustomBulkProducts
-- (one of the two FKs must be set; enforced at application level)

-- Make inventoryItemId optional (was NOT NULL)
ALTER TABLE "item_expiry_batches" ALTER COLUMN "inventoryItemId" DROP NOT NULL;

-- Add CustomBulkProducts FK
ALTER TABLE "item_expiry_batches" ADD COLUMN "customBulkProductId" TEXT;

ALTER TABLE "item_expiry_batches" ADD CONSTRAINT "item_expiry_batches_customBulkProductId_fkey"
    FOREIGN KEY ("customBulkProductId") REFERENCES "custom_bulk_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for custom bulk queries
CREATE INDEX "item_expiry_batches_customBulkProductId_idx" ON "item_expiry_batches"("customBulkProductId");
