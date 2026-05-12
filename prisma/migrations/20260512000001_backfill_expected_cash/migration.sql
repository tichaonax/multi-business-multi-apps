-- Backfill expectedCash and variance for locked EOD reports where expectedCash is NULL.
-- Root cause: the save route previously derived expectedCash from a client-provided JSON
-- snapshot (reportData.paymentMethods.CASH.total) which could be missing. This migration
-- recomputes the value from authoritative business_orders data, matching the fixed save route.

UPDATE saved_reports sr
SET
  "expectedCash" = COALESCE(cash_totals.cash_total, 0),
  variance = CASE
    WHEN sr."cashCounted" IS NOT NULL
    THEN sr."cashCounted" - COALESCE(cash_totals.cash_total, 0)
    ELSE NULL
  END
FROM (
  SELECT
    "businessId",
    DATE(COALESCE("transactionDate", "createdAt")) AS order_date,
    SUM("totalAmount") AS cash_total
  FROM business_orders
  WHERE status = 'COMPLETED'
    AND "paymentMethod" = 'CASH'
  GROUP BY "businessId", DATE(COALESCE("transactionDate", "createdAt"))
) AS cash_totals
WHERE sr."expectedCash" IS NULL
  AND sr."reportType" = 'END_OF_DAY'
  AND sr."businessId" = cash_totals."businessId"
  AND DATE(sr."reportDate") = cash_totals.order_date;

-- For reports where expectedCash is still NULL after the join (no cash orders that day),
-- set expectedCash = 0 so the Till Reconciliation section never shows "—".
UPDATE saved_reports
SET
  "expectedCash" = 0,
  variance = CASE
    WHEN "cashCounted" IS NOT NULL THEN "cashCounted" - 0
    ELSE NULL
  END
WHERE "expectedCash" IS NULL
  AND "reportType" = 'END_OF_DAY';
