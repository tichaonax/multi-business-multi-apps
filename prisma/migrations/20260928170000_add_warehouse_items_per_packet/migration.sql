-- Bulk-stock conversion sync for the warehouse side: manifestQty always
-- stays the original PACKET count (needed as-is for order-max validation
-- against the source manifest); this column records the conversion factor
-- separately so any total computed as manifestQty x linked product price
-- can multiply it back out to the true individual-unit count after a
-- bulk conversion (at Move time, or later via Edit Item).

ALTER TABLE "warehouse_items"
  ADD COLUMN IF NOT EXISTS "itemsPerPacket" INTEGER;
