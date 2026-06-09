-- MBM-238: AYLI Pricing Calibration
-- 1. Move selling prices from pool items → combo items (per-combo pricing)
-- 2. Add buying price + item category to pool items
-- 3. Add meat threshold to combo sizes
-- 4. Create calibration history table

-- Step 1: Add per-combo selling prices to combo items (default 0, filled from pool items below)
ALTER TABLE "as_you_like_it_combo_items"
  ADD COLUMN "pricePerKgSmall"  DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "pricePerKgMedium" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "pricePerKgLarge"  DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Step 2: Copy existing pool item prices into every combo item that references them
UPDATE "as_you_like_it_combo_items" ci
SET
  "pricePerKgSmall"  = pi."pricePerKgSmall",
  "pricePerKgMedium" = pi."pricePerKgMedium",
  "pricePerKgLarge"  = pi."pricePerKgLarge"
FROM "as_you_like_it_pool_items" pi
WHERE ci."poolItemId" = pi.id;

-- Step 3: Add vendor cost + category columns to pool items
ALTER TABLE "as_you_like_it_pool_items"
  ADD COLUMN "buyingPricePerKg" DECIMAL(10,2),
  ADD COLUMN "itemCategory"     TEXT NOT NULL DEFAULT 'OTHER';

-- Step 4: Drop selling price columns from pool items
ALTER TABLE "as_you_like_it_pool_items"
  DROP COLUMN "pricePerKgSmall",
  DROP COLUMN "pricePerKgMedium",
  DROP COLUMN "pricePerKgLarge";

-- Step 5: Add meat threshold to combo sizes
ALTER TABLE "as_you_like_it_combo_sizes"
  ADD COLUMN "meatThresholdKg" DECIMAL(6,3);

-- Step 6: Create calibration history table
CREATE TABLE "ayli_pricing_calibrations" (
  "id"               TEXT NOT NULL,
  "comboId"          TEXT NOT NULL,
  "businessId"       TEXT NOT NULL,
  "version"          INTEGER NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'DRAFT',
  "simulationLines"  JSONB NOT NULL DEFAULT '[]',
  "targetPrices"     JSONB NOT NULL DEFAULT '{}',
  "generatedOptions" JSONB NOT NULL DEFAULT '{}',
  "selectedOptions"  JSONB NOT NULL DEFAULT '{}',
  "appliedAt"        TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ayli_pricing_calibrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ayli_pricing_calibrations_comboId_version_key"
  ON "ayli_pricing_calibrations"("comboId", "version");

ALTER TABLE "ayli_pricing_calibrations"
  ADD CONSTRAINT "ayli_pricing_calibrations_comboId_fkey"
    FOREIGN KEY ("comboId") REFERENCES "as_you_like_it_combos"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "ayli_pricing_calibrations_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id");
