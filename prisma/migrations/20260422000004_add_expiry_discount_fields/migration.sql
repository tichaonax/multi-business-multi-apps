-- AlterTable: add expiry-discount tracking fields to barcode_inventory_items
ALTER TABLE "barcode_inventory_items"
    ADD COLUMN "isExpiryDiscount" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "originalItemId"   TEXT;

-- AddForeignKey (self-reference: discounted item → original item)
ALTER TABLE "barcode_inventory_items" ADD CONSTRAINT "barcode_inventory_items_originalItemId_fkey"
    FOREIGN KEY ("originalItemId") REFERENCES "barcode_inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
