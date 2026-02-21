-- CreateEnum
CREATE TYPE "PromoRewardType" AS ENUM ('CREDIT', 'FREE_WIFI');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('ISSUED', 'REDEEMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "promo_campaigns" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "spendThreshold" DECIMAL(10,2) NOT NULL,
    "rewardType" "PromoRewardType" NOT NULL,
    "rewardAmount" DECIMAL(10,2) NOT NULL,
    "rewardValidDays" INTEGER NOT NULL DEFAULT 30,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_rewards" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "rewardType" "PromoRewardType" NOT NULL,
    "rewardAmount" DECIMAL(10,2) NOT NULL,
    "couponCode" TEXT NOT NULL,
    "status" "RewardStatus" NOT NULL DEFAULT 'ISSUED',
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "redeemedOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promo_campaigns_businessId_isActive_idx" ON "promo_campaigns"("businessId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "customer_rewards_couponCode_key" ON "customer_rewards"("couponCode");

-- CreateIndex
CREATE INDEX "customer_rewards_customerId_status_idx" ON "customer_rewards"("customerId", "status");

-- CreateIndex
CREATE INDEX "customer_rewards_businessId_status_idx" ON "customer_rewards"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_rewards_customerId_campaignId_periodYear_periodMon_key" ON "customer_rewards"("customerId", "campaignId", "periodYear", "periodMonth");

-- AddForeignKey
ALTER TABLE "promo_campaigns" ADD CONSTRAINT "promo_campaigns_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_rewards" ADD CONSTRAINT "customer_rewards_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_rewards" ADD CONSTRAINT "customer_rewards_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_rewards" ADD CONSTRAINT "customer_rewards_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "promo_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_rewards" ADD CONSTRAINT "customer_rewards_redeemedOrderId_fkey" FOREIGN KEY ("redeemedOrderId") REFERENCES "business_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
