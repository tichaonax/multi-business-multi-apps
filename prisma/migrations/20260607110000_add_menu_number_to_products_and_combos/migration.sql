-- Add menuNumber to business_products
ALTER TABLE "business_products" ADD COLUMN "menuNumber" TEXT;

-- Add menuNumber to as_you_like_it_combos
ALTER TABLE "as_you_like_it_combos" ADD COLUMN "menuNumber" TEXT;

-- Partial unique index on business_products: no two active items in the same business share a number
CREATE UNIQUE INDEX "business_products_menuNumber_biz_unique"
  ON "business_products" ("businessId", "menuNumber")
  WHERE "menuNumber" IS NOT NULL AND "isActive" = true;

-- Partial unique index on as_you_like_it_combos: same rule for combos
CREATE UNIQUE INDEX "ayli_combos_menuNumber_biz_unique"
  ON "as_you_like_it_combos" ("businessId", "menuNumber")
  WHERE "menuNumber" IS NOT NULL AND "isActive" = true;
