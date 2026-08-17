-- AlterTable
ALTER TABLE "vehicle_service_tasks" ADD COLUMN     "customerLabourRate" DECIMAL(12,2),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "vehicle_service_labour_rates" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "customerRate" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_service_labour_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_service_labour_rates_businessId_subcategoryId_key" ON "vehicle_service_labour_rates"("businessId", "subcategoryId");

-- AddForeignKey
ALTER TABLE "vehicle_service_labour_rates" ADD CONSTRAINT "vehicle_service_labour_rates_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_labour_rates" ADD CONSTRAINT "vehicle_service_labour_rates_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "inventory_subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_labour_rates" ADD CONSTRAINT "vehicle_service_labour_rates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
