-- Add advertisingNote to display_product_configs
ALTER TABLE "display_product_configs" ADD COLUMN "advertisingNote" TEXT;

-- Add imageId to barcode_inventory_items with FK to images
ALTER TABLE "barcode_inventory_items" ADD COLUMN "imageId" TEXT;
ALTER TABLE "barcode_inventory_items" ADD CONSTRAINT "barcode_inventory_items_imageId_fkey"
  FOREIGN KEY ("imageId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
