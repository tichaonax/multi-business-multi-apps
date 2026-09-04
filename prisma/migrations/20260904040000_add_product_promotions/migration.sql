-- MBM-289: Promotional Sales (Grocery & Clothing) — scheduled discount pricing.
-- No unique constraint on (businessId, itemType, itemId): rows accumulate as
-- history, "the current promo" is always resolved live from startAt/endAt/isPaused.
CREATE TABLE "product_promotions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sourceTable" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_promotions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_promotions_businessId_itemType_itemId_idx" ON "product_promotions"("businessId", "itemType", "itemId");

CREATE INDEX "product_promotions_businessId_startAt_endAt_idx" ON "product_promotions"("businessId", "startAt", "endAt");

ALTER TABLE "product_promotions" ADD CONSTRAINT "product_promotions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
