-- MBM-297: carry a Stock Take/Bulk Stocking row's explicit case/pack cost
-- entry through the draft save/resume round-trip. costPrice on this table
-- stays the computed per-unit cost either way.
ALTER TABLE "stock_take_draft_items" ADD COLUMN "unitsPerPack" INTEGER;
ALTER TABLE "stock_take_draft_items" ADD COLUMN "bulkPackCost" DECIMAL(10,2);
