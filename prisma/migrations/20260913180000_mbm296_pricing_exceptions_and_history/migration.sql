-- MBM-296: cost-price history support + exception review workflow + configurable thresholds

-- AlterTable: product_price_changes previously only ever recorded selling
-- price changes. Adding priceType lets the same table also record cost
-- price changes going forward (existing rows backfill as 'SELLING').
ALTER TABLE "product_price_changes" ADD COLUMN "priceType" VARCHAR(10) NOT NULL DEFAULT 'SELLING';

-- CreateIndex
CREATE INDEX "product_price_changes_priceType_idx" ON "product_price_changes"("priceType");

-- CreateTable
CREATE TABLE "product_exception_reviews" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "catalogSource" VARCHAR(20) NOT NULL,
    "productRefId" TEXT NOT NULL,
    "exceptionType" VARCHAR(40) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "reason" TEXT,
    "notes" TEXT,
    "actedByUserId" TEXT,
    "actedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_exception_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_exception_reviews_businessId_catalogSource_product_key" ON "product_exception_reviews"("businessId", "catalogSource", "productRefId", "exceptionType");

-- CreateIndex
CREATE INDEX "product_exception_reviews_businessId_status_idx" ON "product_exception_reviews"("businessId", "status");

-- AddForeignKey
ALTER TABLE "product_exception_reviews" ADD CONSTRAINT "product_exception_reviews_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_exception_reviews" ADD CONSTRAINT "product_exception_reviews_actedByUserId_fkey" FOREIGN KEY ("actedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "pricing_exception_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "minimumMarginPct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "priceChangeAlertPct" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "decimalErrorMultiples" DECIMAL(65,30)[] DEFAULT ARRAY[10, 100, 0.1, 0.01]::DECIMAL(65,30)[],
    "benchmarkTolerancePct" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "highImpactThreshold" DECIMAL(10,2) NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_exception_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pricing_exception_settings_businessId_key" ON "pricing_exception_settings"("businessId");

-- AddForeignKey
ALTER TABLE "pricing_exception_settings" ADD CONSTRAINT "pricing_exception_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
