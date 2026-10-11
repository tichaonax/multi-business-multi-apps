-- MBM-310: Repair real businesses whose sales data was contaminated by the
-- admin "Test Barcode Generator" (src/lib/test-product-data.ts). That tool
-- writes [TEST]-prefixed products with real stock quantities directly into
-- a chosen business's live inventory tables (custom_bulk_products,
-- clothing_bales, barcode_inventory_items) — it was not restricted to
-- businesses named "TEST", so staff testing barcode printing against real
-- businesses ended up selling fake test products through the real POS,
-- mixed in with genuine sales, for roughly six months (2026-03 to 2026-09).
--
-- The generator itself is now locked down in application code (both the
-- business picker in src/components/layout/global-header.tsx and, more
-- importantly, a hard server-side guard in
-- src/app/api/admin/test-barcode-generator/generate/route.ts) so it can
-- only ever target a business with "TEST" in its name. This migration is
-- the one-time retroactive repair for the orders/ledger/inventory it
-- already corrupted before that guard existed.
--
-- Scope, deliberately:
--   * Only orders with status COMPLETED or PENDING are touched. The small
--     number of tainted orders that were already properly CANCELLED are
--     left alone — their ledger deposit and refund already net to zero via
--     the existing cancellation flow, and cancelled orders are already
--     excluded from every sales report (status filter), so there is
--     nothing to fix there and touching them risks re-opening an
--     already-closed, already-correct case.
--   * Any business with "TEST" in its name is excluded from every step
--     below, by construction (see the WHERE clause building _tainted_orders)
--     — this migration can never touch a business that is intentionally a
--     test business, only ones that aren't.
--   * business_transactions.balanceAfter is intentionally left untouched.
--     It is a per-row historical display snapshot, not the source of
--     truth — src/lib/business-balance-utils.ts's getBusinessBalance()
--     recomputes the real balance live from transaction amounts and
--     explicitly does not trust balanceAfter. Empirically, a plain
--     cumulative-sum recompute does not reproduce the existing stored
--     balanceAfter values for ~90%+ of untouched rows in these businesses
--     today, meaning its true historical formula is more involved than a
--     simple running total — rewriting it blind would risk corrupting
--     thousands of unrelated, legitimate rows. Fixing the underlying
--     amount (below) is what actually makes every live balance and report
--     accurate again, since all of them compute from amount, not from this
--     snapshot column.
--   * restaurant_credit_payments / delivery_account_transactions rows tied
--     to a tainted order are deleted outright (not recomputed in place)
--     because the order they document is itself being deleted or having
--     its fake lines removed — there is nothing real left for them to
--     document.

BEGIN;

-- 1. Collect affected order ids, classified as "pure" (every item on the
--    order is [TEST]) vs "mixed" (a genuine item sits alongside test ones
--    in the same order — e.g. a real bale sale rung up in the same
--    transaction as test items).
CREATE TEMP TABLE _tainted_orders AS
SELECT bo.id, bo."businessId",
       bool_and(COALESCE(boi.attributes->>'productName', '') ILIKE '[TEST]%') AS all_test
FROM business_orders bo
JOIN business_order_items boi ON boi."orderId" = bo.id
JOIN businesses b ON b.id = bo."businessId"
WHERE bo.status IN ('COMPLETED', 'PENDING')
  AND b.name NOT ILIKE '%test%'
GROUP BY bo.id, bo."businessId"
HAVING bool_or(COALESCE(boi.attributes->>'productName', '') ILIKE '[TEST]%');

-- 2. Reverse any real customer credit account that a pure-fake test order
--    debited (or credited) through the restaurant "pay with credit" flow —
--    this is real customer money, not business revenue, so it needs its
--    own explicit reversal rather than falling out of the order/ledger
--    fix below.
WITH impact AS (
  SELECT dat."accountId",
         SUM(CASE WHEN dat.type = 'DEBIT' THEN dat.amount ELSE -dat.amount END) AS net_reversal
  FROM delivery_account_transactions dat
  JOIN _tainted_orders t ON t.id = dat."orderId"
  GROUP BY dat."accountId"
)
UPDATE delivery_customer_accounts dca
SET balance = dca.balance + impact.net_reversal,
    "updatedAt" = NOW()
FROM impact
WHERE dca.id = impact."accountId";

DELETE FROM delivery_account_transactions
WHERE "orderId" IN (SELECT id FROM _tainted_orders);

DELETE FROM restaurant_credit_payments
WHERE "orderId" IN (SELECT id FROM _tainted_orders);

-- 3. Pure-test orders never happened as real sales at all — remove the
--    ledger deposit and delete the order (items first, to satisfy the
--    RESTRICT foreign key from business_order_items to business_orders).
DELETE FROM business_transactions
WHERE "referenceType" = 'order'
  AND "referenceId" IN (SELECT id FROM _tainted_orders WHERE all_test);

DELETE FROM business_order_items
WHERE "orderId" IN (SELECT id FROM _tainted_orders WHERE all_test);

DELETE FROM business_orders
WHERE id IN (SELECT id FROM _tainted_orders WHERE all_test);

-- 4. Mixed orders keep their genuine line items — strip only the [TEST]
--    lines, then recompute the order total and its ledger deposit down to
--    what the real items actually sold for. Every tainted order has
--    taxAmount = discountAmount = 0 (verified before writing this
--    migration), so the real total is simply the sum of the remaining
--    items' totalPrice.
DELETE FROM business_order_items
WHERE "orderId" IN (SELECT id FROM _tainted_orders WHERE NOT all_test)
  AND COALESCE(attributes->>'productName', '') ILIKE '[TEST]%';

WITH recomputed AS (
  SELECT "orderId", SUM("totalPrice") AS real_total
  FROM business_order_items
  WHERE "orderId" IN (SELECT id FROM _tainted_orders WHERE NOT all_test)
  GROUP BY "orderId"
)
UPDATE business_orders bo
SET subtotal        = recomputed.real_total,
    "totalAmount"   = recomputed.real_total,
    "taxAmount"     = 0,
    "discountAmount" = 0,
    "updatedAt"     = NOW()
FROM recomputed
WHERE bo.id = recomputed."orderId";

WITH recomputed AS (
  SELECT "orderId", SUM("totalPrice") AS real_total
  FROM business_order_items
  WHERE "orderId" IN (SELECT id FROM _tainted_orders WHERE NOT all_test)
  GROUP BY "orderId"
)
UPDATE business_transactions bt
SET amount = recomputed.real_total
FROM recomputed
WHERE bt."referenceType" = 'order' AND bt."referenceId" = recomputed."orderId";

-- 5. Purge the underlying fake [TEST] inventory itself from these real
--    businesses' live catalogs. Dependent rows (item_expiry_batches,
--    barcode_print_jobs, business_stock_movements, inventory_transfer_items,
--    clothing_label_print_history) cascade or null out automatically per
--    their existing foreign keys.
DELETE FROM custom_bulk_products
WHERE name ILIKE '[TEST]%'
  AND "businessId" IN (SELECT DISTINCT "businessId" FROM _tainted_orders);

DELETE FROM clothing_bales
WHERE notes ILIKE '%[TEST]%'
  AND "businessId" IN (SELECT DISTINCT "businessId" FROM _tainted_orders);

DELETE FROM barcode_inventory_items
WHERE name ILIKE '[TEST]%'
  AND "businessId" IN (SELECT DISTINCT "businessId" FROM _tainted_orders);

DROP TABLE _tainted_orders;

COMMIT;
