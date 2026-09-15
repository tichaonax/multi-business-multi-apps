-- MBM-297 — bulk-pack cost allocation fields (Phase B), used by Phase A's
-- new "Bulk Cost Allocation Issue" exception detection. `costPrice` on both
-- tables remains the real individual-unit cost; these two columns only let
-- the system derive it correctly (bulkPackCost / unitsPerPack) when a
-- product was bought as a case/pack.

ALTER TABLE "business_products" ADD COLUMN "unitsPerPack" INTEGER;
ALTER TABLE "business_products" ADD COLUMN "bulkPackCost" DECIMAL(10,2);

ALTER TABLE "barcode_inventory_items" ADD COLUMN "unitsPerPack" INTEGER;
ALTER TABLE "barcode_inventory_items" ADD COLUMN "bulkPackCost" DECIMAL(10,2);

-- MBM-297 — implements the previously-dormant HIGH_MARGIN_OUTLIER exception
-- type: mirrors minimumMarginPct on the high side.
ALTER TABLE "pricing_exception_settings" ADD COLUMN "maximumMarginPct" DECIMAL(5,2) NOT NULL DEFAULT 90;
