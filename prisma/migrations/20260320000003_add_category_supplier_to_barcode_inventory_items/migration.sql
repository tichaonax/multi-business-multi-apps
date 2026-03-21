-- Add categoryId and supplierId FK columns to barcode_inventory_items
ALTER TABLE "barcode_inventory_items" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "supplierId" TEXT;

ALTER TABLE "barcode_inventory_items" ADD CONSTRAINT "barcode_inventory_items_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "business_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "barcode_inventory_items" ADD CONSTRAINT "barcode_inventory_items_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "business_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
