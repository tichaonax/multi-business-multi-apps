-- Qty change tracking on warehouse items
-- originalQty / originalPriceYuan: set once on first manual edit, never overwritten
-- qtyChangeReason: overwritten on each edit (most recent reason)

ALTER TABLE warehouse_items
  ADD COLUMN IF NOT EXISTS "originalQty"       INTEGER,
  ADD COLUMN IF NOT EXISTS "originalPriceYuan" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "qtyChangeReason"   TEXT;
