-- MBM-212: Backfill missing CASH_ALLOCATION OUTFLOW entries for daily locked EOD reports.
--
-- Root cause: the overdraft check in the lock route referenced `report.totalReported`,
-- a field that does not exist on cash_allocation_reports. This caused `cashBoxBefore`
-- to always equal 0, so `skipOutflow = true` fired on every daily lock — meaning
-- INFLOW entries were recorded but OUTFLOW entries (the cash being put into expense
-- account boxes) were NEVER created for daily reports.
--
-- This migration creates one OUTFLOW entry per CHECKED line item for every daily
-- locked report that has an INFLOW but no OUTFLOW. It is idempotent: re-running it
-- will insert zero rows if OUTFLOWs already exist for a report.

INSERT INTO "cash_bucket_entries" (
  "id",
  "businessId",
  "entryType",
  "direction",
  "payment_channel",
  "amount",
  "referenceType",
  "referenceId",
  "notes",
  "entryDate",
  "createdAt",
  "createdBy"
)
SELECT
  gen_random_uuid()                         AS "id",
  car."businessId"                          AS "businessId",
  'CASH_ALLOCATION'                         AS "entryType",
  'OUTFLOW'                                 AS "direction",
  'CASH'                                    AS "payment_channel",
  cali."reportedAmount"                     AS "amount",
  'ALLOCATION'                              AS "referenceType",
  car."id"                                  AS "referenceId",
  cali."accountName"                        AS "notes",
  COALESCE(car."lockedAt", car."createdAt") AS "entryDate",
  NOW()                                     AS "createdAt",
  COALESCE(car."lockedBy", car."createdBy") AS "createdBy"

FROM "cash_allocation_reports" car
JOIN "cash_allocation_line_items" cali
  ON cali."reportId" = car."id"

WHERE car."status"    = 'LOCKED'
  AND car."isGrouped" = false

  -- Only rows for reports that already have an INFLOW entry (were properly locked)
  AND EXISTS (
    SELECT 1
    FROM "cash_bucket_entries" cbe_in
    WHERE cbe_in."referenceId" = car."id"
      AND cbe_in."direction"   = 'INFLOW'
  )

  -- Only reports that are still missing OUTFLOWs (idempotency guard)
  AND NOT EXISTS (
    SELECT 1
    FROM "cash_bucket_entries" cbe_out
    WHERE cbe_out."referenceId" = car."id"
      AND cbe_out."direction"   = 'OUTFLOW'
  )

  -- Only confirmed line items (isChecked = true, or rent which is auto-confirmed)
  AND (
    cali."isChecked"   = true
    OR cali."sourceType" = 'EOD_RENT_TRANSFER'
  )

  -- Exclude zero-amount lines (force-closed reports zero out all amounts)
  AND cali."reportedAmount" > 0;
