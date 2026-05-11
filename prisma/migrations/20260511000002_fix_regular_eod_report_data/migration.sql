-- Data correction: regular EOD reports stored stale client-snapshot values for totalSales/totalOrders.
-- Updates all regular EOD reports (groupedRunId IS NULL) where stored totals don't match
-- actual completed orders in the saved period range.
-- No schema changes — UPDATE only.

WITH actual_totals AS (
  SELECT
    sr.id,
    COALESCE(SUM(bo."totalAmount"), 0) AS actual_sales,
    COUNT(bo.id)                       AS actual_orders
  FROM saved_reports sr
  LEFT JOIN business_orders bo
    ON  bo."businessId" = sr."businessId"
    AND bo.status       = 'COMPLETED'
    AND (
          (bo."transactionDate" >= sr."periodStart" AND bo."transactionDate" <= sr."periodEnd")
       OR (bo."transactionDate" IS NULL AND bo."createdAt" >= sr."periodStart" AND bo."createdAt" <= sr."periodEnd")
        )
  WHERE sr."groupedRunId" IS NULL
    AND sr."reportType"   = 'END_OF_DAY'
  GROUP BY sr.id
)
UPDATE saved_reports sr
SET
  "totalSales"     = at.actual_sales,
  "totalOrders"    = at.actual_orders::int,
  "receiptsIssued" = at.actual_orders::int
FROM actual_totals at
WHERE sr.id = at.id
  AND (
    ABS(sr."totalSales"::numeric - at.actual_sales) > 0.01
    OR sr."totalOrders" != at.actual_orders::int
  );
