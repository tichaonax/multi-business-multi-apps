-- Add domainId to stock_take_draft_items so the department selected in bulk stocking
-- flows through to the submit route, allowing it to assign the correct domain to new
-- BarcodeInventoryItems and fix null-domainId categories.

ALTER TABLE stock_take_draft_items ADD COLUMN IF NOT EXISTS domain_id VARCHAR;

-- Add domainId to barcode_inventory_items for direct domain association on the item,
-- so the inventory filter works even when the category has null domainId.

ALTER TABLE barcode_inventory_items ADD COLUMN IF NOT EXISTS domain_id VARCHAR;

-- Backfill barcode_inventory_items.domain_id from the category where possible
UPDATE barcode_inventory_items bi
SET domain_id = bc."domainId"
FROM business_categories bc
WHERE bi."categoryId" = bc.id
  AND bc."domainId" IS NOT NULL
  AND bi.domain_id IS NULL;
