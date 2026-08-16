-- CreateEnum
CREATE TYPE "PartType" AS ENUM ('OEM', 'AFTERMARKET');

-- AlterTable
ALTER TABLE "business_products" ADD COLUMN "partType" "PartType";

-- CreateTable
CREATE TABLE "vehicle_part_compatibility" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vehicleMake" TEXT NOT NULL,
    "vehicleModel" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "engineSpec" TEXT,
    "transmissionType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_part_compatibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_part_compatibility_productId_idx" ON "vehicle_part_compatibility"("productId");

-- CreateIndex
CREATE INDEX "vehicle_part_compatibility_vehicleMake_vehicleModel_idx" ON "vehicle_part_compatibility"("vehicleMake", "vehicleModel");

-- AddForeignKey
ALTER TABLE "vehicle_part_compatibility" ADD CONSTRAINT "vehicle_part_compatibility_productId_fkey" FOREIGN KEY ("productId") REFERENCES "business_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
