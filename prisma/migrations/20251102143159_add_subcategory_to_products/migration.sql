-- DropForeignKey
ALTER TABLE "public"."business_categories" DROP CONSTRAINT "business_categories_businessId_fkey";

-- DropForeignKey
ALTER TABLE "public"."business_suppliers" DROP CONSTRAINT "business_suppliers_businessId_fkey";

-- DropIndex
DROP INDEX "public"."business_categories_businessId_name_key";

-- DropIndex
DROP INDEX "public"."business_suppliers_businessId_supplierNumber_key";

-- AlterTable
ALTER TABLE "public"."business_products" ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "subcategoryId" TEXT,
ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "public"."business_suppliers" ADD COLUMN     "accountBalance" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN     "emoji" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "taxId" TEXT,
ALTER COLUMN "businessId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."business_locations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT,
    "description" TEXT,
    "locationType" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentLocationId" TEXT,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_locations_businessId_locationCode_key" ON "public"."business_locations"("businessId", "locationCode");

-- AddForeignKey
ALTER TABLE "public"."business_categories" ADD CONSTRAINT "business_categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_products" ADD CONSTRAINT "business_products_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "public"."inventory_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_products" ADD CONSTRAINT "business_products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."business_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_products" ADD CONSTRAINT "business_products_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."business_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_suppliers" ADD CONSTRAINT "business_suppliers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_locations" ADD CONSTRAINT "business_locations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_locations" ADD CONSTRAINT "business_locations_parentLocationId_fkey" FOREIGN KEY ("parentLocationId") REFERENCES "public"."business_locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
