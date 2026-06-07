ALTER TABLE "display_product_configs" ADD COLUMN "advertisingImageId" TEXT;
ALTER TABLE "display_product_configs" ADD CONSTRAINT "display_product_configs_advertisingImageId_fkey"
  FOREIGN KEY ("advertisingImageId") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
