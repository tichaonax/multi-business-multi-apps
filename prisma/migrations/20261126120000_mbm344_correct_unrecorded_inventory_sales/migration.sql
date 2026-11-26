-- MBM-344: past sales of inventory items (barcode_inventory_items) that never
-- reduced stock.
--
-- Cause: the order line carried isInventoryItem but no inventoryItemId (the
-- clothing inventory page's "add to cart"), or came before the 2026-05-22 fix
-- for null productVariantId. The order API skipped those lines silently.
-- The code is fixed in the same change; this corrects the past.
--
-- Rules (approved by the owner, 2026-11-26):
--   1. A line whose item can't be found (no ID, and no single item with that
--      SKU in the business) is left alone. It is only reported.
--   2. Every found line gets inventoryItemId added to its attributes, so a
--      refund of it restores stock.
--   3. A line is NOT deducted when the item's count was set again after the
--      sale: the item was created after it, or an ADJUSTMENT movement, a
--      submitted stock take with a physical count, or a zero-out came later.
--      That count already reflects the sale.
--   4. An item is NOT deducted at all when deducting its missed sales would
--      take its stock below zero. Its count was most likely fixed by hand
--      already. Those items are listed for a stock count.
--   5. Otherwise: a SALE movement per line (reference = the order number,
--      dated at the sale, attributes.correction = 'MBM-344'), and the stock is
--      reduced by the item's total.
-- Running it again changes nothing: a line with a SALE movement for its order
-- and item is no longer "missed".

CREATE TEMP TABLE mbm344_missed AS
WITH lines AS (
  SELECT oi.id AS line_id, o.id AS order_id, o."orderNumber" AS order_number, o."businessId" AS business_id,
         o."businessType" AS business_type, COALESCE(o."transactionDate", o."createdAt") AS sold_at,
         oi.quantity, oi.attributes->>'sku' AS sku, oi.attributes->>'inventoryItemId' AS given_id
  FROM business_order_items oi
  JOIN business_orders o ON o.id = oi."orderId"
  WHERE oi.attributes->>'isInventoryItem' = 'true'
    AND o.status = 'COMPLETED' AND o."orderType" = 'SALE'
    AND oi.quantity > 0 AND COALESCE(oi.attributes->>'isReturn', 'false') <> 'true'
    AND oi."productVariantId" IS NULL
), resolved AS (
  SELECT l.*, COALESCE(
      (SELECT b.id FROM barcode_inventory_items b WHERE b.id = l.given_id AND b."businessId" = l.business_id),
      (SELECT min(b.id) FROM barcode_inventory_items b
        WHERE l.given_id IS NULL AND b."businessId" = l.business_id AND b.sku = l.sku
        HAVING count(*) = 1)) AS item_id
  FROM lines l
)
SELECT r.*, b."stockQuantity" AS stock_now,
  (b."createdAt" > r.sold_at
   OR EXISTS (SELECT 1 FROM business_stock_movements m
              WHERE m."barcodeInventoryItemId" = b.id AND m."movementType" = 'ADJUSTMENT' AND m."createdAt" > r.sold_at)
   OR EXISTS (SELECT 1 FROM stock_take_draft_items di JOIN stock_take_drafts d ON d.id = di."draftId"
              WHERE d.status = 'SUBMITTED' AND d."businessId" = r.business_id AND di."physicalCount" IS NOT NULL
                AND di.barcode = b."barcodeData" AND d."updatedAt" > r.sold_at)
   OR EXISTS (SELECT 1 FROM audit_logs a
              WHERE a.action = 'PRODUCT_ZEROED_OUT' AND a."entityId" IN (b.id, 'inv_' || b.id) AND a.timestamp > r.sold_at)
  ) AS recounted_since
FROM resolved r
JOIN barcode_inventory_items b ON b.id = r.item_id
WHERE NOT EXISTS (SELECT 1 FROM business_stock_movements m
                  WHERE m."businessId" = r.business_id AND m.reference = r.order_number
                    AND m."movementType" = 'SALE' AND m."barcodeInventoryItemId" = r.item_id);

-- Rule 4: the items deducted are those whose stock stays at or above zero
CREATE TEMP TABLE mbm344_items AS
SELECT item_id, sum(quantity) AS qty
FROM mbm344_missed
WHERE NOT recounted_since
GROUP BY item_id
HAVING max(stock_now) - sum(quantity) >= 0;

-- Rule 2: the item ID on every found line (refunds)
UPDATE business_order_items oi
SET attributes = oi.attributes || jsonb_build_object('inventoryItemId', m.item_id)
FROM mbm344_missed m
WHERE oi.id = m.line_id AND m.given_id IS NULL;

-- Rule 5: the missing SALE movements
INSERT INTO business_stock_movements
  (id, "businessId", "barcodeInventoryItemId", "movementType", quantity, reference, reason, "businessType", attributes, "createdAt")
SELECT gen_random_uuid()::text, m.business_id, m.item_id, 'SALE', m.quantity, m.order_number,
       'MBM-344 correction: this sale did not reduce stock at the time', m.business_type,
       jsonb_build_object('correction', 'MBM-344', 'orderId', m.order_id, 'orderItemId', m.line_id, 'correctedAt', now()),
       m.sold_at
FROM mbm344_missed m
JOIN mbm344_items i ON i.item_id = m.item_id
WHERE NOT m.recounted_since;

-- Rule 5: the stock
UPDATE barcode_inventory_items b
SET "stockQuantity" = b."stockQuantity" - i.qty, "updatedAt" = now()
FROM mbm344_items i
WHERE b.id = i.item_id;

DROP TABLE mbm344_items;
DROP TABLE mbm344_missed;
