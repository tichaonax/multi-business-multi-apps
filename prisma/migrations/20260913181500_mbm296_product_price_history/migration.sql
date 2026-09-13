-- MBM-296: unified cost/selling price change history across both product catalogs

-- CreateTable
CREATE TABLE "product_price_history" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "catalogSource" VARCHAR(20) NOT NULL,
    "productRefId" TEXT NOT NULL,
    "priceType" VARCHAR(10) NOT NULL,
    "oldPrice" DECIMAL(10,2),
    "newPrice" DECIMAL(10,2) NOT NULL,
    "changedBy" TEXT,
    "changeReason" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_price_history_businessId_catalogSource_productRef_idx" ON "product_price_history"("businessId", "catalogSource", "productRefId", "priceType", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
