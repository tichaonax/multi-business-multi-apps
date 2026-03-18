-- Sync barcode field to scanCode for all existing bales
-- where barcode was defaulted to sku at creation time.
-- Going forward new bales are created with barcode = scanCode.
UPDATE "clothing_bales"
SET "barcode" = "scanCode"
WHERE "barcode" = "sku";
