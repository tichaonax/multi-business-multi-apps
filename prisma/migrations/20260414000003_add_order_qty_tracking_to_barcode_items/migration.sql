-- Add order quantity tracking columns to barcode_inventory_items
-- lastOrderQty: quantity from the most recent stock addition
-- maxOrderQty: highest single stock addition in the past 90 days (updated on each add)
-- lastOrderedAt: timestamp of the most recent stock addition

ALTER TABLE "barcode_inventory_items"
  ADD COLUMN "lastOrderQty" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxOrderQty" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastOrderedAt" TIMESTAMP(3);
