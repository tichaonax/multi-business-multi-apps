-- Drop old combo items table (no data yet, safe to recreate)
DROP TABLE IF EXISTS "as_you_like_it_combo_items";

-- CreateTable: as_you_like_it_pool_items
CREATE TABLE "as_you_like_it_pool_items" (
    "id"               TEXT NOT NULL,
    "businessId"       TEXT NOT NULL,
    "name"             TEXT NOT NULL,
    "pricePerKgSmall"  DECIMAL(10,2) NOT NULL,
    "pricePerKgMedium" DECIMAL(10,2) NOT NULL,
    "pricePerKgLarge"  DECIMAL(10,2) NOT NULL,
    "isActive"         BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"        INTEGER NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "as_you_like_it_pool_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey for pool items -> businesses
ALTER TABLE "as_you_like_it_pool_items"
    ADD CONSTRAINT "as_you_like_it_pool_items_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate as_you_like_it_combo_items with poolItemId instead of productId + prices
CREATE TABLE "as_you_like_it_combo_items" (
    "id"         TEXT NOT NULL,
    "comboId"    TEXT NOT NULL,
    "poolItemId" TEXT NOT NULL,
    "sortOrder"  INTEGER NOT NULL DEFAULT 0,
    "isActive"   BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "as_you_like_it_combo_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: combo items -> combo
ALTER TABLE "as_you_like_it_combo_items"
    ADD CONSTRAINT "as_you_like_it_combo_items_comboId_fkey"
    FOREIGN KEY ("comboId") REFERENCES "as_you_like_it_combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: combo items -> pool item
ALTER TABLE "as_you_like_it_combo_items"
    ADD CONSTRAINT "as_you_like_it_combo_items_poolItemId_fkey"
    FOREIGN KEY ("poolItemId") REFERENCES "as_you_like_it_pool_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: unique combo + pool item pair
CREATE UNIQUE INDEX "as_you_like_it_combo_items_comboId_poolItemId_key"
    ON "as_you_like_it_combo_items"("comboId", "poolItemId");
