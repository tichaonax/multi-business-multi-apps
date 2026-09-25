-- MBM-300 revert: the standalone InventoryImportBatches/InventoryImportItems
-- design (migration 20260925000000) is superseded by consolidating this
-- feature into the existing Warehouse system instead (WarehouseBatches /
-- WarehouseItems) per the user's decision. Both new tables were still empty
-- (confirmed before writing this) — safe to drop outright, no data loss.

-- DropForeignKey
ALTER TABLE "barcode_inventory_items" DROP CONSTRAINT IF EXISTS "barcode_inventory_items_importBatchId_fkey";
ALTER TABLE "inventory_import_items" DROP CONSTRAINT IF EXISTS "inventory_import_items_importBatchId_fkey";
ALTER TABLE "inventory_import_items" DROP CONSTRAINT IF EXISTS "inventory_import_items_imageId_fkey";
ALTER TABLE "inventory_import_items" DROP CONSTRAINT IF EXISTS "inventory_import_items_createdInventoryItemId_fkey";
ALTER TABLE "inventory_import_batches" DROP CONSTRAINT IF EXISTS "inventory_import_batches_businessId_fkey";
ALTER TABLE "inventory_import_batches" DROP CONSTRAINT IF EXISTS "inventory_import_batches_importedById_fkey";

-- DropTable
DROP TABLE IF EXISTS "inventory_import_items";
DROP TABLE IF EXISTS "inventory_import_batches";

-- AlterTable
ALTER TABLE "barcode_inventory_items"
  DROP COLUMN IF EXISTS "importBatchId",
  DROP COLUMN IF EXISTS "trackingNumber",
  DROP COLUMN IF EXISTS "orderNumber";
