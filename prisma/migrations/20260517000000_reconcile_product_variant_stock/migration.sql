-- ReconcileStock: subtract all-time net sold units from product_variants.stockQuantity
-- Fixes inflation caused by tx.product_variants (invalid snake_case) silently skipping decrements.
-- Excludes virtual items (bales, wifi tokens, services, custom bulk, fake inv_ IDs).
-- Floors at 0 to prevent negative stock.
UPDATE product_variants pv
SET "stockQuantity" = GREATEST(0, pv."stockQuantity" - sold.net_sold)
FROM (
  SELECT
    boi."productVariantId",
    SUM(boi.quantity) AS net_sold
  FROM business_order_items boi
  JOIN business_orders bo ON boi."orderId" = bo.id
  WHERE boi."productVariantId" IS NOT NULL
    AND boi."productVariantId" NOT LIKE 'inv_%'
    AND boi.attributes->>'wifiToken' IS DISTINCT FROM 'true'
    AND boi.attributes->>'r710Token' IS DISTINCT FROM 'true'
    AND (boi.attributes->>'baleId') IS NULL
    AND boi.attributes->>'isService' IS DISTINCT FROM 'true'
    AND boi.attributes->>'businessService' IS DISTINCT FROM 'true'
    AND boi.attributes->>'customBulkId' IS NULL
    AND bo.status NOT IN ('CANCELLED', 'REFUNDED')
  GROUP BY boi."productVariantId"
  HAVING SUM(boi.quantity) > 0
) sold
WHERE pv.id = sold."productVariantId";
