-- Migration: Repair missing inventory decrements for grocery/universal POS sales
--
-- Root cause: commit bd399cbf (2026-05-17) introduced a broken filter in
-- /api/universal/orders/route.ts that required productVariantId.startsWith('inv_')
-- before decrementing barcode_inventory_items.stockQuantity. Grocery POS sends
-- productVariantId = NULL for inventory items, so those items were silently skipped.
--
-- This migration:
--   1. Finds all COMPLETED order items from 2026-05-17 onwards that were skipped
--   2. Applies the missing stockQuantity decrements to barcode_inventory_items
--   3. Inserts business_stock_movements rows for a full audit trail
--
-- Idempotent: the NOT EXISTS guard on reason='repair-migration' prevents
-- double-decrement if this migration is run more than once.
--
-- Clothing Quick Add orders are NOT affected — they sent productVariantId='inv_<id>'
-- which DID pass the original filter and were decremented correctly.

DO $$
DECLARE
  total_order_items  INT := 0;
  total_items_updated INT := 0;
BEGIN

  -- Collect all order-item rows that missed their decrement
  CREATE TEMP TABLE _repair_inv_decrements AS
  SELECT
    boi."orderId"                          AS order_id,
    bo."orderNumber"                       AS order_number,
    bo."businessId"                        AS business_id,
    bo."businessType"                      AS business_type,
    bo."createdAt"                         AS order_created_at,
    boi.attributes->>'inventoryItemId'     AS inventory_item_id,
    boi.quantity                           AS qty
  FROM business_order_items boi
  JOIN business_orders bo ON bo.id = boi."orderId"
  WHERE
    -- Grocery / Universal POS inventory items have null productVariantId
    boi."productVariantId" IS NULL
    AND (boi.attributes->>'isInventoryItem') = 'true'
    AND boi.attributes->>'inventoryItemId' IS NOT NULL
    AND boi.attributes->>'inventoryItemId' <> ''
    -- Only orders placed on or after the bug was introduced
    AND bo."createdAt" >= '2026-05-17T00:00:00Z'
    -- Only completed sales (skip cancelled / refunded)
    AND bo.status::text NOT IN ('CANCELLED', 'REFUNDED')
    -- Idempotency: skip rows already covered by a previous run of this migration
    AND NOT EXISTS (
      SELECT 1
      FROM business_stock_movements bsm
      WHERE bsm."barcodeInventoryItemId" = boi.attributes->>'inventoryItemId'
        AND bsm.reference                = bo."orderNumber"
        AND bsm."movementType"::text     = 'SALE'
        AND bsm.reason                   = 'repair-migration'
    );

  SELECT COUNT(*) INTO total_order_items FROM _repair_inv_decrements;
  RAISE NOTICE '[repair-migration] % order-item rows need stockQuantity correction', total_order_items;

  IF total_order_items = 0 THEN
    RAISE NOTICE '[repair-migration] Nothing to do — already up to date';
    DROP TABLE _repair_inv_decrements;
    RETURN;
  END IF;

  -- Apply aggregated decrements to barcode_inventory_items
  -- (aggregate across all affected orders per item so we do one UPDATE per item)
  UPDATE barcode_inventory_items bi
  SET
    "stockQuantity" = bi."stockQuantity" - agg.total_qty,
    "updatedAt"     = NOW()
  FROM (
    SELECT inventory_item_id, SUM(qty) AS total_qty
    FROM _repair_inv_decrements
    GROUP BY inventory_item_id
  ) agg
  WHERE bi.id = agg.inventory_item_id;

  GET DIAGNOSTICS total_items_updated = ROW_COUNT;
  RAISE NOTICE '[repair-migration] Updated stockQuantity on % barcode_inventory_items rows', total_items_updated;

  -- Insert one stock movement per order-item row for a full audit trail.
  -- Backfilled to the original order timestamp so reports show the sale on the correct date.
  -- reason='repair-migration' doubles as the idempotency marker for future runs.
  INSERT INTO business_stock_movements (
    id,
    "businessId",
    "barcodeInventoryItemId",
    "movementType",
    quantity,
    reference,
    reason,
    "businessType",
    "createdAt"
  )
  SELECT
    gen_random_uuid()::text,
    business_id,
    inventory_item_id,
    'SALE'::"StockMovementType",
    qty,
    order_number,
    'repair-migration',
    business_type,
    order_created_at
  FROM _repair_inv_decrements;

  RAISE NOTICE '[repair-migration] Inserted % stock movement audit records', total_order_items;

  DROP TABLE _repair_inv_decrements;

END $$;
