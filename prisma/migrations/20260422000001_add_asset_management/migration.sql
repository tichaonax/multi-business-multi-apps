-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultDepreciationMethod" TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
    "defaultUsefulLifeYears" INTEGER,
    "defaultSalvageValuePct" DECIMAL(5,2),
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_assets" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT,
    "assetTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serialNumber" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "location" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchasePrice" DECIMAL(10,2) NOT NULL,
    "currentBookValue" DECIMAL(10,2) NOT NULL,
    "salvageValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "depreciationMethod" TEXT NOT NULL DEFAULT 'STRAIGHT_LINE',
    "usefulLifeYears" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "disposedAt" TIMESTAMP(3),
    "disposalMethod" TEXT,
    "disposalValue" DECIMAL(10,2),
    "disposalRecipient" TEXT,
    "disposalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "business_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_depreciation_entries" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "bookValueAfter" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "asset_depreciation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenance_logs" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "maintenanceDate" TIMESTAMP(3) NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(10,2),
    "vendor" TEXT,
    "nextMaintenanceDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "asset_maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_assets_assetTag_key" ON "business_assets"("assetTag");

-- CreateIndex
CREATE INDEX "business_assets_businessId_idx" ON "business_assets"("businessId");

-- CreateIndex
CREATE INDEX "business_assets_status_idx" ON "business_assets"("status");

-- CreateIndex
CREATE INDEX "asset_depreciation_entries_assetId_idx" ON "asset_depreciation_entries"("assetId");

-- CreateIndex
CREATE INDEX "asset_maintenance_logs_assetId_idx" ON "asset_maintenance_logs"("assetId");

-- AddForeignKey
ALTER TABLE "business_assets" ADD CONSTRAINT "business_assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_depreciation_entries" ADD CONSTRAINT "asset_depreciation_entries_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "business_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance_logs" ADD CONSTRAINT "asset_maintenance_logs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "business_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default asset categories (system-wide, businessId = NULL)
INSERT INTO "asset_categories" ("id", "name", "description", "defaultDepreciationMethod", "defaultUsefulLifeYears", "defaultSalvageValuePct", "icon", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Vehicles', 'Cars, trucks, motorcycles and other vehicles', 'DECLINING_BALANCE', 5, 10.00, 'truck', NOW(), NOW()),
  (gen_random_uuid(), 'Office Equipment', 'Desks, chairs, filing cabinets and office furnishings', 'STRAIGHT_LINE', 5, 10.00, 'briefcase', NOW(), NOW()),
  (gen_random_uuid(), 'Furniture', 'Tables, chairs and general furniture', 'STRAIGHT_LINE', 10, 10.00, 'sofa', NOW(), NOW()),
  (gen_random_uuid(), 'IT Equipment', 'Computers, servers, networking gear and electronics', 'DECLINING_BALANCE', 3, 5.00, 'monitor', NOW(), NOW()),
  (gen_random_uuid(), 'Machinery & Tools', 'Industrial machinery, power tools and equipment', 'STRAIGHT_LINE', 10, 10.00, 'wrench', NOW(), NOW()),
  (gen_random_uuid(), 'Land & Buildings', 'Real estate, land and permanent structures', 'NONE', NULL, 0.00, 'building', NOW(), NOW());
