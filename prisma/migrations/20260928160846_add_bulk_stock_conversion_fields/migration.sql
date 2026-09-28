-- Bulk-stock conversion: permanent, one-way classification for items that
-- were recorded as N packets but are actually N x unitsPerPack sellable
-- units. `isBulkStock` flips to true exactly once, at the moment of
-- conversion (Move to Business, or later via Edit Item); it is never
-- reverted. `unitsPerPack`/`bulkPackCost` already exist on both tables
-- (MBM-297) and become the permanent record of the packet economics.

ALTER TABLE "business_products"
  ADD COLUMN IF NOT EXISTS "isBulkStock" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bulkConvertedAt" TIMESTAMP(3);

ALTER TABLE "barcode_inventory_items"
  ADD COLUMN IF NOT EXISTS "isBulkStock" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bulkConvertedAt" TIMESTAMP(3);
