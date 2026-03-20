-- Make barcodeTemplateId nullable to support generic template printing
ALTER TABLE "barcode_inventory_items"
  ALTER COLUMN "barcodeTemplateId" DROP NOT NULL;
