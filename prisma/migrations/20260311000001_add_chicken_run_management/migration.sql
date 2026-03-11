-- CreateEnum
CREATE TYPE "ChickenBatchStatus" AS ENUM ('GROWING', 'CULLING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ChickenMortalityReason" AS ENUM ('DISEASE', 'INJURY', 'PREDATOR', 'UNKNOWN', 'OTHER');

-- CreateEnum
CREATE TYPE "ChickenInventorySource" AS ENUM ('RAISED', 'PURCHASED');

-- CreateEnum
CREATE TYPE "ChickenMovementType" AS ENUM ('FREEZER_IN', 'KITCHEN_OUT', 'BUSINESS_TRANSFER');

-- CreateEnum
CREATE TYPE "ChickenWeightEntryMode" AS ENUM ('INDIVIDUAL', 'BULK_TOTAL', 'BULK_LIST');

-- CreateEnum
CREATE TYPE "ChickenWeighingStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "chicken_batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "initialCount" INTEGER NOT NULL,
    "currentAliveCount" INTEGER NOT NULL,
    "supplierName" TEXT,
    "purchaseCostTotal" DECIMAL(10,2) NOT NULL,
    "costPerChick" DECIMAL(10,2) NOT NULL,
    "purchaseExpensePaymentId" TEXT,
    "expectedCullDate" TIMESTAMP(3),
    "status" "ChickenBatchStatus" NOT NULL DEFAULT 'GROWING',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chicken_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_mortalities" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "reason" "ChickenMortalityReason" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chicken_mortalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_feed_logs" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "feedType" TEXT NOT NULL,
    "quantityKg" DECIMAL(10,3) NOT NULL,
    "costPerKg" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "supplierName" TEXT,
    "expensePaymentId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chicken_feed_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_medication_logs" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "medicationName" TEXT NOT NULL,
    "quantityMl" DECIMAL(10,3),
    "quantityG" DECIMAL(10,3),
    "totalCost" DECIMAL(10,2) NOT NULL,
    "administeredBy" TEXT,
    "expensePaymentId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chicken_medication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_weight_logs" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weekAge" INTEGER NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "avgWeightKg" DECIMAL(10,3) NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chicken_weight_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_vaccination_schedules" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayAge" INTEGER NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chicken_vaccination_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_vaccination_logs" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "administeredBy" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chicken_vaccination_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_cullings" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "cullingDate" TIMESTAMP(3) NOT NULL,
    "weighingStatus" "ChickenWeighingStatus" NOT NULL DEFAULT 'OPEN',
    "weightEntryMode" "ChickenWeightEntryMode" NOT NULL DEFAULT 'INDIVIDUAL',
    "quantityCulled" INTEGER NOT NULL,
    "totalWeightKg" DECIMAL(10,3) NOT NULL,
    "avgWeightKg" DECIMAL(10,3) NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "chicken_cullings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_inventory" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "source" "ChickenInventorySource" NOT NULL,
    "cullingId" TEXT,
    "supplierName" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "weighingStatus" "ChickenWeighingStatus" NOT NULL DEFAULT 'OPEN',
    "weightEntryMode" "ChickenWeightEntryMode" NOT NULL DEFAULT 'INDIVIDUAL',
    "quantityWhole" INTEGER NOT NULL,
    "totalWeightKg" DECIMAL(10,3) NOT NULL,
    "costPerBird" DECIMAL(10,2) NOT NULL,
    "costPerKg" DECIMAL(10,2) NOT NULL,
    "quantityInFreezer" INTEGER NOT NULL,
    "expensePaymentId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "chicken_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_bird_weights" (
    "id" TEXT NOT NULL,
    "cullingId" TEXT,
    "inventoryId" TEXT,
    "weightKg" DECIMAL(6,3) NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chicken_bird_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_inventory_movements" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "movementDate" TIMESTAMP(3) NOT NULL,
    "movementType" "ChickenMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weightKg" DECIMAL(10,3),
    "destinationBusinessId" TEXT,
    "purpose" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chicken_inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_utility_costs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "utilityType" TEXT NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "expensePaymentId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chicken_utility_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_labor_logs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "workerName" TEXT,
    "hoursWorked" DECIMAL(5,2) NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "expensePaymentId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chicken_labor_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chicken_run_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "lowInventoryThreshold" INTEGER NOT NULL DEFAULT 10,
    "highMortalityThreshold" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chicken_run_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chicken_batches_batchNumber_key" ON "chicken_batches"("batchNumber");

-- CreateIndex
CREATE INDEX "chicken_batches_businessId_idx" ON "chicken_batches"("businessId");

-- CreateIndex
CREATE INDEX "chicken_batches_status_idx" ON "chicken_batches"("status");

-- CreateIndex
CREATE INDEX "chicken_mortalities_batchId_idx" ON "chicken_mortalities"("batchId");

-- CreateIndex
CREATE INDEX "chicken_feed_logs_batchId_idx" ON "chicken_feed_logs"("batchId");

-- CreateIndex
CREATE INDEX "chicken_medication_logs_batchId_idx" ON "chicken_medication_logs"("batchId");

-- CreateIndex
CREATE INDEX "chicken_weight_logs_batchId_idx" ON "chicken_weight_logs"("batchId");

-- CreateIndex
CREATE INDEX "chicken_vaccination_schedules_businessId_idx" ON "chicken_vaccination_schedules"("businessId");

-- CreateIndex
CREATE INDEX "chicken_vaccination_logs_batchId_idx" ON "chicken_vaccination_logs"("batchId");

-- CreateIndex
CREATE INDEX "chicken_cullings_batchId_idx" ON "chicken_cullings"("batchId");

-- CreateIndex
CREATE INDEX "chicken_inventory_businessId_idx" ON "chicken_inventory"("businessId");

-- CreateIndex
CREATE INDEX "chicken_bird_weights_cullingId_idx" ON "chicken_bird_weights"("cullingId");

-- CreateIndex
CREATE INDEX "chicken_bird_weights_inventoryId_idx" ON "chicken_bird_weights"("inventoryId");

-- CreateIndex
CREATE INDEX "chicken_inventory_movements_inventoryId_idx" ON "chicken_inventory_movements"("inventoryId");

-- CreateIndex
CREATE INDEX "chicken_utility_costs_businessId_idx" ON "chicken_utility_costs"("businessId");

-- CreateIndex
CREATE INDEX "chicken_labor_logs_businessId_idx" ON "chicken_labor_logs"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "chicken_run_settings_businessId_key" ON "chicken_run_settings"("businessId");

-- AddForeignKey
ALTER TABLE "chicken_batches" ADD CONSTRAINT "chicken_batches_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_mortalities" ADD CONSTRAINT "chicken_mortalities_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "chicken_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_feed_logs" ADD CONSTRAINT "chicken_feed_logs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "chicken_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_medication_logs" ADD CONSTRAINT "chicken_medication_logs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "chicken_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_weight_logs" ADD CONSTRAINT "chicken_weight_logs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "chicken_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_vaccination_schedules" ADD CONSTRAINT "chicken_vaccination_schedules_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_vaccination_logs" ADD CONSTRAINT "chicken_vaccination_logs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "chicken_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_vaccination_logs" ADD CONSTRAINT "chicken_vaccination_logs_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "chicken_vaccination_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_cullings" ADD CONSTRAINT "chicken_cullings_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "chicken_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_inventory" ADD CONSTRAINT "chicken_inventory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_inventory" ADD CONSTRAINT "chicken_inventory_cullingId_fkey" FOREIGN KEY ("cullingId") REFERENCES "chicken_cullings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_bird_weights" ADD CONSTRAINT "chicken_bird_weights_cullingId_fkey" FOREIGN KEY ("cullingId") REFERENCES "chicken_cullings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_bird_weights" ADD CONSTRAINT "chicken_bird_weights_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "chicken_inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_inventory_movements" ADD CONSTRAINT "chicken_inventory_movements_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "chicken_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_utility_costs" ADD CONSTRAINT "chicken_utility_costs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_labor_logs" ADD CONSTRAINT "chicken_labor_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chicken_run_settings" ADD CONSTRAINT "chicken_run_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
