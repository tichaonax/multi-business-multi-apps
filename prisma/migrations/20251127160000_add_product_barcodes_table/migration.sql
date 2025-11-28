-- CreateEnum for BarcodeType
CREATE TYPE "BarcodeType" AS ENUM (
  'UPC_A',
  'UPC_E',
  'EAN_13',
  'EAN_8',
  'CODE128',
  'CODE39',
  'ITF',
  'CODABAR',
  'QR_CODE',
  'DATA_MATRIX',
  'PDF417',
  'CUSTOM',
  'SKU_BARCODE'
);

-- CreateTable for product_barcodes
CREATE TABLE IF NOT EXISTS "product_barcodes" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "code" TEXT NOT NULL,
    "type" "BarcodeType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isUniversal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "notes" TEXT,
    "businessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "business_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
