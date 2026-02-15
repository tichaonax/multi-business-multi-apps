-- Make productVariantId nullable on inventory_transfer_items
-- Bale transfers use baleId instead of productVariantId

-- Drop the existing foreign key constraint
ALTER TABLE "inventory_transfer_items" DROP CONSTRAINT IF EXISTS "inventory_transfer_items_productVariantId_fkey";

-- Make the column nullable
ALTER TABLE "inventory_transfer_items" ALTER COLUMN "productVariantId" DROP NOT NULL;

-- Re-add the foreign key constraint (now allowing NULL)
ALTER TABLE "inventory_transfer_items"
  ADD CONSTRAINT "inventory_transfer_items_productVariantId_fkey"
  FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
