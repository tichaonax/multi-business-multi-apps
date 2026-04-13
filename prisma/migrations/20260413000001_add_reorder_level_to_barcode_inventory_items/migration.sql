-- AlterTable: add reorderLevel to barcode_inventory_items
ALTER TABLE "barcode_inventory_items" ADD COLUMN "reorderLevel" INTEGER NOT NULL DEFAULT 0;
