-- CreateEnum
CREATE TYPE "BarcodePrintJobStatus" AS ENUM ('QUEUED', 'PRINTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "barcode_templates" (
    "id" TEXT NOT NULL,
    "barcodeValue" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "extraInfo" JSONB,
    "symbology" TEXT NOT NULL DEFAULT 'CODE128',
    "dpi" INTEGER NOT NULL DEFAULT 300,
    "quietZone" INTEGER NOT NULL DEFAULT 10,
    "paperSize" TEXT NOT NULL DEFAULT 'A6',
    "orientation" TEXT NOT NULL DEFAULT 'portrait',
    "layoutTemplate" JSONB NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barcode_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_print_jobs" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "printedQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "BarcodePrintJobStatus" NOT NULL DEFAULT 'QUEUED',
    "printerId" TEXT,
    "printSettings" JSONB NOT NULL,
    "printedAt" TIMESTAMP(3),
    "userNotes" TEXT,
    "businessId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barcode_print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_inventory_items" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "barcodeTemplateId" TEXT NOT NULL,
    "location" TEXT,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "barcode_inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barcode_templates_barcodeValue_key" ON "barcode_templates"("barcodeValue");

-- AddForeignKey
ALTER TABLE "barcode_templates" ADD CONSTRAINT "barcode_templates_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_print_jobs" ADD CONSTRAINT "barcode_print_jobs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_print_jobs" ADD CONSTRAINT "barcode_print_jobs_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "network_printers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_print_jobs" ADD CONSTRAINT "barcode_print_jobs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "barcode_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_inventory_items" ADD CONSTRAINT "barcode_inventory_items_barcodeTemplateId_fkey" FOREIGN KEY ("barcodeTemplateId") REFERENCES "barcode_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_inventory_items" ADD CONSTRAINT "barcode_inventory_items_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
