-- Fix custom bulk product remaining counts
-- Reconciles remainingCount against actual sales recorded in business_order_items.
-- Covers all historical sales where customBulkId was stored in item attributes.

UPDATE custom_bulk_products cbp
SET "remainingCount" = GREATEST(0, cbp."itemCount" - COALESCE(sales.total_sold, 0))
FROM (
  SELECT
    attributes->>'customBulkId' AS bulk_id,
    SUM(quantity)::int           AS total_sold
  FROM business_order_items
  WHERE attributes->>'customBulkId' IS NOT NULL
  GROUP BY attributes->>'customBulkId'
) sales
WHERE cbp.id = sales.bulk_id
  AND cbp."remainingCount" != GREATEST(0, cbp."itemCount" - COALESCE(sales.total_sold, 0));

-- Auto-deactivate any custom bulk products that are now fully sold out
UPDATE custom_bulk_products
SET "isActive" = false
WHERE "remainingCount" <= 0
  AND "isActive" = true;
