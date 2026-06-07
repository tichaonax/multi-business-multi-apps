-- CreateTable: as_you_like_it_combos
CREATE TABLE "as_you_like_it_combos" (
    "id"          TEXT NOT NULL,
    "businessId"  TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "maxWeightKg" DECIMAL(6,3) NOT NULL DEFAULT 8.000,
    "maxItems"    INTEGER NOT NULL DEFAULT 7,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "as_you_like_it_combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable: as_you_like_it_combo_sizes
CREATE TABLE "as_you_like_it_combo_sizes" (
    "id"        TEXT NOT NULL,
    "comboId"   TEXT NOT NULL,
    "sizeName"  TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "as_you_like_it_combo_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: as_you_like_it_combo_items
CREATE TABLE "as_you_like_it_combo_items" (
    "id"               TEXT NOT NULL,
    "comboId"          TEXT NOT NULL,
    "productId"        TEXT NOT NULL,
    "pricePerKgSmall"  DECIMAL(10,2) NOT NULL,
    "pricePerKgMedium" DECIMAL(10,2) NOT NULL,
    "pricePerKgLarge"  DECIMAL(10,2) NOT NULL,
    "sortOrder"        INTEGER NOT NULL DEFAULT 0,
    "isActive"         BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "as_you_like_it_combo_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "as_you_like_it_combos"
    ADD CONSTRAINT "as_you_like_it_combos_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "as_you_like_it_combo_sizes"
    ADD CONSTRAINT "as_you_like_it_combo_sizes_comboId_fkey"
    FOREIGN KEY ("comboId") REFERENCES "as_you_like_it_combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "as_you_like_it_combo_items"
    ADD CONSTRAINT "as_you_like_it_combo_items_comboId_fkey"
    FOREIGN KEY ("comboId") REFERENCES "as_you_like_it_combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "as_you_like_it_combo_items"
    ADD CONSTRAINT "as_you_like_it_combo_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "business_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "as_you_like_it_combo_sizes_comboId_sizeName_key"
    ON "as_you_like_it_combo_sizes"("comboId", "sizeName");

-- CreateIndex
CREATE UNIQUE INDEX "as_you_like_it_combo_items_comboId_productId_key"
    ON "as_you_like_it_combo_items"("comboId", "productId");
