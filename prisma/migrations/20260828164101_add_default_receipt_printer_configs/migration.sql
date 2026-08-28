-- MBM-283 Phase 3: business-wide default receipt printer.
-- CreateTable
CREATE TABLE "default_receipt_printer_configs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_receipt_printer_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "default_receipt_printer_configs_businessId_key" ON "default_receipt_printer_configs"("businessId");

-- CreateIndex
CREATE INDEX "default_receipt_printer_configs_printerId_idx" ON "default_receipt_printer_configs"("printerId");

-- AddForeignKey
ALTER TABLE "default_receipt_printer_configs" ADD CONSTRAINT "default_receipt_printer_configs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_receipt_printer_configs" ADD CONSTRAINT "default_receipt_printer_configs_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "network_printers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "default_receipt_printer_configs" ADD CONSTRAINT "default_receipt_printer_configs_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
