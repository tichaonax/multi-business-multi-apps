-- Migration: fix grocery-associate POS badge visibility and stale phantom PENDING EOD records
--
-- 1. Migration 20260426000001 explicitly set canViewPOSSoldCount/canViewPOSStockCount
--    to TRUE for grocery-associate in the DB. The code preset has since been corrected to
--    FALSE, but explicit DB values override the preset. This migration aligns them.
--
-- 2. Deletes stale PENDING salesperson EOD records with $0 amounts that were auto-created
--    on the WRONG date. Root cause: Prisma serializes JS Date objects to @db.Date columns
--    using the UTC date, not the server local date. On an Africa/Harare server (UTC+2),
--    `new Date(); setHours(0,0,0,0)` = midnight Harare = Apr 27 22:00 UTC, so Prisma
--    sends '2026-04-27' to the DB instead of '2026-04-28'. The pending route has been
--    fixed to use CURRENT_DATE from the database instead.
--
--    Guard: deletes PENDING rows with $0 amounts where the creation date (in the DB
--    timezone, Africa/Harare) is strictly AFTER the stored report_date. This is only
--    possible when a record was written with the previous-day's UTC date due to the
--    Prisma timezone serialization bug. Submitted records (status != 'PENDING') and
--    records with non-zero amounts are never touched.

-- ── Part 1: reset grocery-associate POS badge perms to false ─────────────────────
UPDATE business_memberships
SET permissions = jsonb_set(
      jsonb_set(permissions, '{canViewPOSSoldCount}',  'false'::jsonb, true),
                             '{canViewPOSStockCount}', 'false'::jsonb, true)
WHERE role = 'grocery-associate';

-- ── Part 2: delete stale $0 PENDING records created by the Prisma date bug ───────
-- ::date cast uses the DB session timezone (Africa/Harare) automatically.
-- For the phantom Apr 27 record: created_at = Apr 28 17:19 Harare → ::date = Apr 28
-- report_date = Apr 27 (wrong, sent by Prisma as UTC date of Harare midnight)
-- Apr 28 > Apr 27 = TRUE → deleted.
-- For a legitimate same-day record: created_at date = report_date → FALSE → kept.
DELETE FROM salesperson_eod_reports
WHERE status = 'PENDING'
  AND "cashAmount"    = 0
  AND "ecocashAmount" = 0
  AND "createdAt"::date > "reportDate";
