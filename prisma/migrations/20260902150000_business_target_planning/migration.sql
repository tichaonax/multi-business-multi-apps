-- MBM-288: Business Target & Cash-Flow Planning — Phase 0 (schema only).
-- See ai-contexts/project-plans/review/projectplan-MBM-288-business-target-cash-flow-planning-2026-09-02.md
-- for the full design. Purely additive — 5 new tables, no changes to any
-- existing table. (This migration.sql was hand-extracted from a broader
-- `prisma migrate diff` run, which also reported a large amount of
-- pre-existing, unrelated schema drift against the live DB — those unrelated
-- ALTER/DROP/RenameIndex statements are deliberately NOT included here.)

-- CreateTable
CREATE TABLE "business_target_configs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bufferType" TEXT NOT NULL DEFAULT 'PERCENT',
    "bufferValue" DECIMAL(6,2) NOT NULL DEFAULT 10,
    "minimumRequiredMonthlyTarget" DECIMAL(12,2),
    "recommendedMonthlyTarget" DECIMAL(12,2),
    "approvedMonthlyTarget" DECIMAL(12,2),
    "lastCalculatedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_target_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_target_commitments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "monthlyAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_target_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_target_override_history" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "previousValue" DECIMAL(12,2),
    "newValue" DECIMAL(12,2),
    "reason" TEXT,
    "breakdownSnapshot" JSONB,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_target_override_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_target_day_adjustments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "adjustedTargetAmount" DECIMAL(12,2),
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_target_day_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_trading_schedules" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tradesMonday" BOOLEAN NOT NULL DEFAULT true,
    "tradesTuesday" BOOLEAN NOT NULL DEFAULT true,
    "tradesWednesday" BOOLEAN NOT NULL DEFAULT true,
    "tradesThursday" BOOLEAN NOT NULL DEFAULT true,
    "tradesFriday" BOOLEAN NOT NULL DEFAULT true,
    "tradesSaturday" BOOLEAN NOT NULL DEFAULT true,
    "tradesSunday" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_trading_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_target_configs_businessId_key" ON "business_target_configs"("businessId");

-- CreateIndex
CREATE INDEX "business_target_configs_businessId_idx" ON "business_target_configs"("businessId");

-- CreateIndex
CREATE INDEX "business_target_commitments_businessId_isActive_idx" ON "business_target_commitments"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "business_target_override_history_businessId_changedAt_idx" ON "business_target_override_history"("businessId", "changedAt");

-- CreateIndex
CREATE INDEX "business_target_day_adjustments_businessId_date_idx" ON "business_target_day_adjustments"("businessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "business_target_day_adjustments_businessId_date_key" ON "business_target_day_adjustments"("businessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "business_trading_schedules_businessId_key" ON "business_trading_schedules"("businessId");

-- AddForeignKey
ALTER TABLE "business_target_configs" ADD CONSTRAINT "business_target_configs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_target_configs" ADD CONSTRAINT "business_target_configs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_target_configs" ADD CONSTRAINT "business_target_configs_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_target_commitments" ADD CONSTRAINT "business_target_commitments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_target_commitments" ADD CONSTRAINT "business_target_commitments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_target_commitments" ADD CONSTRAINT "business_target_commitments_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_target_override_history" ADD CONSTRAINT "business_target_override_history_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_target_override_history" ADD CONSTRAINT "business_target_override_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_target_day_adjustments" ADD CONSTRAINT "business_target_day_adjustments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_target_day_adjustments" ADD CONSTRAINT "business_target_day_adjustments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_trading_schedules" ADD CONSTRAINT "business_trading_schedules_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_trading_schedules" ADD CONSTRAINT "business_trading_schedules_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
