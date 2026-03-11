-- Fix: previous migration (20260311000002) added snake_case supplier_id columns
-- but this codebase uses camelCase column names (e.g. "supplierId").
-- Also drop the old "supplierName" columns that were not removed previously.

-- chicken_batches
ALTER TABLE chicken_batches DROP COLUMN IF EXISTS supplier_id;
ALTER TABLE chicken_batches DROP COLUMN IF EXISTS "supplierName";
ALTER TABLE chicken_batches ADD COLUMN IF NOT EXISTS "supplierId" TEXT REFERENCES business_suppliers(id);

-- chicken_feed_logs
ALTER TABLE chicken_feed_logs DROP COLUMN IF EXISTS supplier_id;
ALTER TABLE chicken_feed_logs DROP COLUMN IF EXISTS "supplierName";
ALTER TABLE chicken_feed_logs ADD COLUMN IF NOT EXISTS "supplierId" TEXT REFERENCES business_suppliers(id);

-- chicken_inventory
ALTER TABLE chicken_inventory DROP COLUMN IF EXISTS supplier_id;
ALTER TABLE chicken_inventory DROP COLUMN IF EXISTS "supplierName";
ALTER TABLE chicken_inventory ADD COLUMN IF NOT EXISTS "supplierId" TEXT REFERENCES business_suppliers(id);
