-- Migration: Replace supplierName (text) with supplierId (FK) in chicken run tables
-- This aligns with the standard pattern used across the codebase (BusinessProducts, etc.)

-- chicken_batches
ALTER TABLE chicken_batches ADD COLUMN supplier_id TEXT REFERENCES business_suppliers(id);
ALTER TABLE chicken_batches DROP COLUMN IF EXISTS supplier_name;

-- chicken_feed_logs
ALTER TABLE chicken_feed_logs ADD COLUMN supplier_id TEXT REFERENCES business_suppliers(id);
ALTER TABLE chicken_feed_logs DROP COLUMN IF EXISTS supplier_name;

-- chicken_inventory
ALTER TABLE chicken_inventory ADD COLUMN supplier_id TEXT REFERENCES business_suppliers(id);
ALTER TABLE chicken_inventory DROP COLUMN IF EXISTS supplier_name;
