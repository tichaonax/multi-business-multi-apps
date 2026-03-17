-- Add scanCode to barcode_templates
-- scanCode is an 8-char hex token (like employee scanToken: randomBytes(4).toString('hex'))
-- The barcode encodes scanCode (short, always fits on 58mm label)
-- barcodeValue stays as the friendly display text shown below the barcode

-- Step 1: Add column as nullable
ALTER TABLE "barcode_templates" ADD COLUMN IF NOT EXISTS "scanCode" VARCHAR(8);

-- Step 2: Populate existing rows with LEFT(MD5(id), 8) — deterministic, unique, no extension needed
UPDATE "barcode_templates" SET "scanCode" = LEFT(MD5(id), 8) WHERE "scanCode" IS NULL;

-- Step 3: Set NOT NULL now that all rows have a value
ALTER TABLE "barcode_templates" ALTER COLUMN "scanCode" SET NOT NULL;

-- Step 4: Add unique constraint per business
CREATE UNIQUE INDEX IF NOT EXISTS "barcode_templates_business_scan_code_unique"
  ON "barcode_templates"("businessId", "scanCode");
