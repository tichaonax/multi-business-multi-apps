-- Data correction: grouped EOD catch-up reports had wrong values written by the route.
-- cashCounted was always NULL, totalSales was a stale client preview, totalOrders/receiptsIssued were hardcoded 0.
-- No schema changes — UPDATE only.

-- Step 1: Fix saved_reports rows that came from a grouped EOD run
WITH actual_totals AS (
  SELECT
    sr.id                                AS report_id,
    sr."groupedRunId",
    COALESCE(SUM(bo."totalAmount"), 0)   AS actual_sales,
    COUNT(bo.id)                         AS actual_orders
  FROM saved_reports sr
  LEFT JOIN business_orders bo
    ON  bo."businessId" = sr."businessId"
    AND bo.status       = 'COMPLETED'
    AND (
          (bo."transactionDate" >= sr."periodStart" AND bo."transactionDate" <= sr."periodEnd")
       OR (bo."transactionDate" IS NULL AND bo."createdAt" >= sr."periodStart" AND bo."createdAt" <= sr."periodEnd")
        )
  WHERE sr."groupedRunId" IS NOT NULL
    AND sr."reportType"   = 'END_OF_DAY'
  GROUP BY sr.id, sr."groupedRunId"
),
run_sales AS (
  SELECT
    "groupedRunId",
    SUM(actual_sales) AS run_total_sales,
    COUNT(*)          AS day_count
  FROM actual_totals
  GROUP BY "groupedRunId"
),
cash_per_report AS (
  SELECT
    at.report_id,
    at.actual_sales,
    at.actual_orders,
    CASE
      WHEN rs.run_total_sales > 0
        THEN (at.actual_sales / rs.run_total_sales) * COALESCE(gr."totalCashReceived", 0)
      ELSE
        COALESCE(gr."totalCashReceived", 0) / rs.day_count
    END AS cash_counted
  FROM actual_totals at
  JOIN run_sales          rs ON rs."groupedRunId" = at."groupedRunId"
  JOIN grouped_eod_runs   gr ON gr.id             = at."groupedRunId"
)
UPDATE saved_reports sr
SET
  "totalSales"     = cpr.actual_sales,
  "totalOrders"    = cpr.actual_orders::int,
  "receiptsIssued" = cpr.actual_orders::int,
  "cashCounted"    = cpr.cash_counted
FROM cash_per_report cpr
WHERE sr.id = cpr.report_id;

-- Step 2: Fix grouped_eod_run_dates (reuses period ranges from saved_reports for consistent timezone handling)
WITH actual_totals AS (
  SELECT
    gerd.id                              AS run_date_id,
    gerd."groupedRunId",
    COALESCE(SUM(bo."totalAmount"), 0)   AS actual_sales
  FROM grouped_eod_run_dates gerd
  JOIN saved_reports sr
    ON  sr."groupedRunId"                          = gerd."groupedRunId"
    AND TO_CHAR(sr."reportDate", 'YYYY-MM-DD')     = gerd.date
  LEFT JOIN business_orders bo
    ON  bo."businessId" = sr."businessId"
    AND bo.status       = 'COMPLETED'
    AND (
          (bo."transactionDate" >= sr."periodStart" AND bo."transactionDate" <= sr."periodEnd")
       OR (bo."transactionDate" IS NULL AND bo."createdAt" >= sr."periodStart" AND bo."createdAt" <= sr."periodEnd")
        )
  GROUP BY gerd.id, gerd."groupedRunId"
),
run_sales AS (
  SELECT
    "groupedRunId",
    SUM(actual_sales) AS run_total_sales,
    COUNT(*)          AS day_count
  FROM actual_totals
  GROUP BY "groupedRunId"
),
cash_per_date AS (
  SELECT
    at.run_date_id,
    at.actual_sales,
    CASE
      WHEN rs.run_total_sales > 0
        THEN (at.actual_sales / rs.run_total_sales) * COALESCE(gr."totalCashReceived", 0)
      ELSE
        COALESCE(gr."totalCashReceived", 0) / rs.day_count
    END AS cash_counted
  FROM actual_totals at
  JOIN run_sales        rs ON rs."groupedRunId" = at."groupedRunId"
  JOIN grouped_eod_runs gr ON gr.id             = at."groupedRunId"
)
UPDATE grouped_eod_run_dates gerd
SET
  "totalSales"  = cpd.actual_sales,
  "cashCounted" = cpd.cash_counted
FROM cash_per_date cpd
WHERE gerd.id = cpd.run_date_id;
