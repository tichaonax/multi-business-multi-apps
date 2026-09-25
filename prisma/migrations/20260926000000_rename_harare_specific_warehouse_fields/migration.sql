-- Rename Harare-specific column names to generic ones — a batch's collection
-- point isn't always Harare, and the old names baked in an assumption that
-- no longer holds.
ALTER TABLE "warehouse_batches" RENAME COLUMN "pickedUpFromHarare" TO "pickedUpAtCollectionPoint";
ALTER TABLE "warehouse_batches" RENAME COLUMN "transportCostHarare" TO "collectionTransportCost";
