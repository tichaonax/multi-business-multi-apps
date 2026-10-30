-- MBM-329: free menu samples with customer-specific return-purchase offers
-- CreateTable
CREATE TABLE "sample_offers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "offerCode" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "sampledProductId" TEXT NOT NULL,
    "sampledVariantId" TEXT,
    "sampledProductName" TEXT NOT NULL,
    "issuedOrderId" TEXT NOT NULL,
    "issuedByUserId" TEXT,
    "issuedByEmployeeId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validityDays" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "redeemedAt" TIMESTAMP(3),
    "redeemedOrderId" TEXT,
    "redeemedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_offer_promo_items" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "suppliedProductId" TEXT,
    "suppliedProductName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_offer_promo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_offer_substitutions" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "redemptionOrderId" TEXT NOT NULL,
    "lineRole" TEXT NOT NULL,
    "promoItemId" TEXT,
    "originalProductId" TEXT NOT NULL,
    "originalProductName" TEXT NOT NULL,
    "substituteProductId" TEXT NOT NULL,
    "substituteProductName" TEXT NOT NULL,
    "substituteUnitPrice" DECIMAL(10,2) NOT NULL,
    "customerAccepted" BOOLEAN NOT NULL DEFAULT true,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_offer_substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sample_offers_offerCode_key" ON "sample_offers"("offerCode");

-- CreateIndex
CREATE UNIQUE INDEX "sample_offers_issuedOrderId_key" ON "sample_offers"("issuedOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "sample_offers_redeemedOrderId_key" ON "sample_offers"("redeemedOrderId");

-- CreateIndex
CREATE INDEX "sample_offers_businessId_issuedAt_idx" ON "sample_offers"("businessId", "issuedAt");

-- CreateIndex
CREATE INDEX "sample_offers_businessId_status_idx" ON "sample_offers"("businessId", "status");

-- CreateIndex
CREATE INDEX "sample_offers_businessId_redeemedAt_idx" ON "sample_offers"("businessId", "redeemedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sample_offers_customerId_sampledProductId_key" ON "sample_offers"("customerId", "sampledProductId");

-- CreateIndex
CREATE INDEX "sample_offer_promo_items_offerId_idx" ON "sample_offer_promo_items"("offerId");

-- CreateIndex
CREATE INDEX "sample_offer_substitutions_offerId_idx" ON "sample_offer_substitutions"("offerId");

-- CreateIndex
CREATE INDEX "sample_offer_substitutions_redemptionOrderId_idx" ON "sample_offer_substitutions"("redemptionOrderId");

-- AddForeignKey
ALTER TABLE "sample_offers" ADD CONSTRAINT "sample_offers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_offers" ADD CONSTRAINT "sample_offers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_offers" ADD CONSTRAINT "sample_offers_sampledProductId_fkey" FOREIGN KEY ("sampledProductId") REFERENCES "business_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_offers" ADD CONSTRAINT "sample_offers_issuedOrderId_fkey" FOREIGN KEY ("issuedOrderId") REFERENCES "business_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_offers" ADD CONSTRAINT "sample_offers_redeemedOrderId_fkey" FOREIGN KEY ("redeemedOrderId") REFERENCES "business_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_offer_promo_items" ADD CONSTRAINT "sample_offer_promo_items_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "sample_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_offer_substitutions" ADD CONSTRAINT "sample_offer_substitutions_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "sample_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_offer_substitutions" ADD CONSTRAINT "sample_offer_substitutions_redemptionOrderId_fkey" FOREIGN KEY ("redemptionOrderId") REFERENCES "business_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

