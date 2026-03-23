-- CreateTable
CREATE TABLE "custom_bulk_products" (
    "id"             TEXT NOT NULL,
    "businessId"     TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "categoryId"     TEXT,
    "supplierId"     TEXT,
    "employeeId"     TEXT,
    "batchNumber"    TEXT NOT NULL,
    "itemCount"      INTEGER NOT NULL,
    "remainingCount" INTEGER NOT NULL,
    "unitPrice"      DECIMAL(10,2) NOT NULL,
    "costPrice"      DECIMAL(10,2),
    "sku"            TEXT NOT NULL,
    "barcode"        TEXT NOT NULL,
    "notes"          TEXT,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_bulk_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_bulk_products_businessId_idx" ON "custom_bulk_products"("businessId");

-- CreateIndex
CREATE INDEX "custom_bulk_products_barcode_idx" ON "custom_bulk_products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "custom_bulk_products_businessId_batchNumber_key" ON "custom_bulk_products"("businessId", "batchNumber");

-- AddForeignKey
ALTER TABLE "custom_bulk_products" ADD CONSTRAINT "custom_bulk_products_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_bulk_products" ADD CONSTRAINT "custom_bulk_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "business_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_bulk_products" ADD CONSTRAINT "custom_bulk_products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "business_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_bulk_products" ADD CONSTRAINT "custom_bulk_products_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
