-- CreateTable
CREATE TABLE "clothing_bale_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clothing_bale_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothing_bales" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "remainingCount" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "bogoActive" BOOLEAN NOT NULL DEFAULT false,
    "bogoRatio" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "employeeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clothing_bales_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add baleId to inventory_transfer_items
ALTER TABLE "inventory_transfer_items" ADD COLUMN "baleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clothing_bale_categories_name_key" ON "clothing_bale_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_bales_sku_key" ON "clothing_bales"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_bales_businessId_batchNumber_key" ON "clothing_bales"("businessId", "batchNumber");

-- AddForeignKey
ALTER TABLE "clothing_bales" ADD CONSTRAINT "clothing_bales_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_bales" ADD CONSTRAINT "clothing_bales_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "clothing_bale_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_bales" ADD CONSTRAINT "clothing_bales_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "inventory_transfer_items_baleId_fkey" FOREIGN KEY ("baleId") REFERENCES "clothing_bales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed initial bale categories
INSERT INTO "clothing_bale_categories" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'Children Mix', 'Mixed children''s clothing items', true, NOW(), NOW()),
    (gen_random_uuid(), 'Ladies Mixed Dresses', 'Assorted ladies'' dresses', true, NOW(), NOW()),
    (gen_random_uuid(), 'Ladies Tops', 'Ladies'' tops and blouses', true, NOW(), NOW()),
    (gen_random_uuid(), 'Ladies Skirts', 'Ladies'' skirts', true, NOW(), NOW()),
    (gen_random_uuid(), 'Men''s T-Shirts', 'Men''s t-shirts and casual tops', true, NOW(), NOW()),
    (gen_random_uuid(), 'Men''s Jeans', 'Men''s jeans and denim', true, NOW(), NOW()),
    (gen_random_uuid(), 'Men''s Shoes', 'Men''s footwear', true, NOW(), NOW()),
    (gen_random_uuid(), 'Unisex Bottoms', 'Unisex pants, shorts, and bottoms', true, NOW(), NOW()),
    (gen_random_uuid(), 'Ladies Jumpsuits', 'Ladies'' jumpsuits and rompers', true, NOW(), NOW()),
    (gen_random_uuid(), 'Kids Jackets', 'Children''s jackets and outerwear', true, NOW(), NOW()),
    (gen_random_uuid(), 'Adults Jackets', 'Adult jackets and outerwear', true, NOW(), NOW()),
    (gen_random_uuid(), 'Kids Shoes', 'Children''s footwear', true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
