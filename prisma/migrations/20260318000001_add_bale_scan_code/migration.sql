-- Migration: Add scanCode to clothing_bales
-- Each bale gets a unique 4-byte hex scan code (same pattern as employee scanToken)
-- The label shows the bale SKU as friendly text but encodes this short scanCode in the barcode

-- Step 1: Add nullable scanCode column
ALTER TABLE "clothing_bales" ADD COLUMN "scanCode" TEXT;

-- Step 2: Backfill existing bales with unique random-style codes derived from their id
-- Using left 8 chars of MD5(id) gives deterministic, short, unique hex values
UPDATE "clothing_bales"
SET "scanCode" = LEFT(MD5(id::TEXT), 8)
WHERE "scanCode" IS NULL;

-- Step 3: Make NOT NULL and add UNIQUE constraint
ALTER TABLE "clothing_bales" ALTER COLUMN "scanCode" SET NOT NULL;
ALTER TABLE "clothing_bales" ADD CONSTRAINT "clothing_bales_scanCode_key" UNIQUE ("scanCode");
