-- Allow item_expiry_batches to reference ProductVariants (quick-stock flow)
-- All three FKs (inventoryItemId, customBulkProductId, productVariantId) are optional;
-- application layer ensures exactly one is set.

ALTER TABLE "item_expiry_batches" ADD COLUMN "productVariantId" TEXT;

ALTER TABLE "item_expiry_batches" ADD CONSTRAINT "item_expiry_batches_productVariantId_fkey"
    FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "item_expiry_batches_productVariantId_idx" ON "item_expiry_batches"("productVariantId");
