-- Migration: merge_duplicate_bulk_stock_items
--
-- Root cause: /api/inventory/bulk-add-stock was using
--   barcodeData = barcode?.trim() || randomBytes(4).toString('hex')
-- This meant every item submitted without a real barcode received a unique
-- random barcodeData, so the deduplication check (findFirst by barcodeData)
-- never matched. Repeated bulk-stock of the same product name resulted in
-- many separate BarcodeInventoryItems instead of one with accumulated stock.
--
-- This migration merges all BarcodeInventoryItems that share the same
-- (businessId, name) pair and have auto-generated SKUs (pattern: XXX-INV-00000).
-- For each duplicate group:
--   • The earliest-created record is kept as the survivor
--   • Its stockQuantity and quantity are set to the SUM of all duplicates
--   • All other records in the group are deleted

WITH
-- Identify duplicate groups and compute totals + ordered IDs
duplicate_info AS (
  SELECT
    "businessId",
    name,
    SUM("stockQuantity")::integer                                   AS total_stock,
    SUM(quantity)::integer                                          AS total_qty,
    array_agg(id ORDER BY "createdAt" ASC, id ASC)                 AS ordered_ids
  FROM barcode_inventory_items
  WHERE sku ~ '^[A-Z]+-INV-[0-9]+$'   -- only auto-generated SKUs
  GROUP BY "businessId", name
  HAVING COUNT(*) > 1                  -- only groups with actual duplicates
),
-- Update the survivor (first element) with the summed stock
updated_survivors AS (
  UPDATE barcode_inventory_items b
  SET
    "stockQuantity" = di.total_stock,
    quantity        = di.total_qty,
    "updatedAt"     = NOW()
  FROM duplicate_info di
  WHERE b.id = di.ordered_ids[1]
  RETURNING b.id, di.ordered_ids
)
-- Delete all duplicates except the survivor
DELETE FROM barcode_inventory_items
WHERE id IN (
  SELECT unnest(ordered_ids[2:array_length(ordered_ids, 1)])
  FROM updated_survivors
);
