-- Fix expectedCash and variance for all locked END_OF_DAY saved_reports.
--
-- Root cause of the shortfall report bug:
--   The salesperson-shortfall API was computing expectedShare using cashCounted
--   (the manager's physical till count, which can be amended) instead of
--   expectedCash (the authoritative POS cash total from business_orders).
--   This caused two symptoms:
--     1. After an amendment, expectedShare equalled the amended cashCounted,
--        hiding the real variance between POS cash and submitted cash.
--     2. expectedShare was always 0 variance for normal days (cashCounted was
--        the same as submitted cash in a single-salesperson shop).
--
--   The API formula has been corrected to use expectedCash / submittedCount.
--   This migration re-asserts that expectedCash is populated correctly from
--   business_orders (authoritative, Africa/Harare timezone) for ALL locked
--   END_OF_DAY reports, and recomputes variance = cashCounted - expectedCash.
--   It is idempotent and safe to re-run.

UPDATE saved_reports sr
SET
  "expectedCash" = sub.cash_total,
  "variance" = CASE
    WHEN sr."cashCounted" IS NOT NULL
    THEN sr."cashCounted" - sub.cash_total
    ELSE NULL
  END
FROM (
  SELECT
    sr2.id                                                                                        AS report_id,
    COALESCE(
      SUM(CASE WHEN bo."paymentMethod" = 'CASH' THEN bo."totalAmount" ELSE 0 END),
      0
    )                                                                                             AS cash_total
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
