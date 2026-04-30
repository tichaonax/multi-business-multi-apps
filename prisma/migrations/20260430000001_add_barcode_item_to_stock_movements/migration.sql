-- Make productVariantId nullable (it was required; now barcode items use barcodeInventoryItemId instead)
ALTER TABLE "business_stock_movements" ALTER COLUMN "productVariantId" DROP NOT NULL;

-- Add barcodeInventoryItemId column with FK to barcode_inventory_items
ALTER TABLE "business_stock_movements" ADD COLUMN "barcodeInventoryItemId" TEXT;
ALTER TABLE "business_stock_movements" ADD CONSTRAINT "business_stock_movements_barcodeInventoryItemId_fkey"
  FOREIGN KEY ("barcodeInventoryItemId") REFERENCES "barcode_inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
