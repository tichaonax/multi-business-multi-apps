-- Fix totalOrders, totalSales, expectedCash, and variance on locked END_OF_DAY reports
-- where these values were computed using the wrong timezone (server's Houston CDT instead
-- of Africa/Harare UTC+2). The correct UTC range for a Harare business day is:
--   start: reportDate 00:00 Africa/Harare  = reportDate-1 22:00 UTC
--   end:   reportDate 24:00 Africa/Harare  = reportDate   22:00 UTC
--
-- PostgreSQL AT TIME ZONE converts a local timestamp to UTC correctly.
-- e.g. TIMESTAMP '2026-05-10 00:00:00' AT TIME ZONE 'Africa/Harare' = 2026-05-09 22:00:00 UTC

UPDATE saved_reports sr
SET
  "totalOrders"    = sub.total_orders,
  "totalSales"     = sub.total_sales,
  "receiptsIssued" = sub.total_orders,
  "expectedCash"   = sub.cash_total,
  "variance" = CASE
    WHEN sr."cashCounted" IS NOT NULL
    THEN sr."cashCounted" - sub.cash_total
    ELSE NULL
  END
FROM (
  SELECT
    sr2.id                                                                     AS report_id,
    COUNT(bo.id)                                                               AS total_orders,
    COALESCE(SUM(bo."totalAmount"), 0)                                         AS total_sales,
    COALESCE(SUM(CASE WHEN bo."paymentMethod" = 'CASH' THEN bo."totalAmount" ELSE 0 END), 0) AS cash_total
  FROM saved_reports sr2
  LEFT JOIN business_orders bo
    ON  bo."businessId" = sr2."businessId"
    AND bo.status = 'COMPLETED'
    AND COALESCE(bo."transactionDate", bo."createdAt") >= (sr2."reportDate"::timestamp AT TIME ZONE 'Africa/Harare')
    AND COALESCE(bo."transactionDate", bo."createdAt") <  ((sr2."reportDate"::timestamp + INTERVAL '1 day') AT TIME ZONE 'Africa/Harare')
  WHERE sr2."reportType" = 'END_OF_DAY'
    AND sr2."isLocked" = true
  GROUP BY sr2.id
) sub
WHERE sr.id = sub.report_id;
