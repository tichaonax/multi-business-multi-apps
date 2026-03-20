-- Migration: add costPrice and sellingPrice to barcode_inventory_items
ALTER TABLE "barcode_inventory_items"
  ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "sellingPrice" DECIMAL(10,2);
