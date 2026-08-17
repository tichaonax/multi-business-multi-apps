-- AlterTable
ALTER TABLE "inventory_transfer_items" ADD COLUMN "sourceLocationId" TEXT,
ADD COLUMN "destinationLocationId" TEXT;

-- AddForeignKey
ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "inventory_transfer_items_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "business_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transfer_items" ADD CONSTRAINT "inventory_transfer_items_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "business_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
