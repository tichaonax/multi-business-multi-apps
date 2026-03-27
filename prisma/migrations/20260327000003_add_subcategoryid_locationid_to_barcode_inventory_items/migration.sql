-- Add subcategoryId and locationId to barcode_inventory_items
-- subcategoryId: FK to inventory_subcategories for subcategory tracking
-- locationId: FK to business_locations for location tracking

ALTER TABLE "barcode_inventory_items" ADD COLUMN IF NOT EXISTS "subcategoryId" TEXT;
ALTER TABLE "barcode_inventory_items" ADD COLUMN IF NOT EXISTS "locationId" TEXT;

ALTER TABLE "barcode_inventory_items"
  ADD CONSTRAINT "barcode_inventory_items_subcategoryId_fkey"
  FOREIGN KEY ("subcategoryId") REFERENCES "inventory_subcategories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "barcode_inventory_items"
  ADD CONSTRAINT "barcode_inventory_items_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "business_locations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
