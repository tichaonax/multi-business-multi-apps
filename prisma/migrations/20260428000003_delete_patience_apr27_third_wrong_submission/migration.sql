-- Migration: delete Patience Chimedza's third incorrect Apr 27 SUBMITTED EOD record
--
-- What happened:
--   After migration 20260428000002 cleaned up the first wrong submission, Patience
--   re-submitted at ~15:20 Harare time on Apr 28. The POST handler in
--   /api/eod/salesperson/route.ts used new Date(reportDate + 'T00:00:00') for BOTH
--   the WHERE lookup AND the @db.Date storage field. WHERE is correct (Harare local
--   midnight = Apr 27 22:00 UTC, matches stored date). But storage is wrong: Prisma
--   extracts the UTC date of that JS Date → sends '2026-04-27' → stored as Apr 27.
--   The upsert found no existing Apr 27 record (deleted by 20260428000002) so it
--   created a new one, again on the wrong date.
--
--   Root cause code is now fixed: POST route uses queryDate (T00:00:00 = local
--   midnight) for WHERE and storeDate (T00:00:00.000Z = UTC midnight) for storage.
--
-- Guards (all must be true):
--   businessId    = Mvimvi Groceries
--   salespersonId = Patience Chimedza
--   reportDate    = 2026-04-27  (wrong date — should have been Apr 28)
--   status        = SUBMITTED
--   submittedAt on Apr 28 (submitted today, after the report date)

DELETE FROM salesperson_eod_reports
WHERE "businessId"    = '8015cfa3-f26e-4667-be70-87fbeaba6455'
  AND "salespersonId" = '4983271b-6fdb-4976-990a-db0fe969fcad'
  AND "reportDate"    = '2026-04-27'
  AND status          = 'SUBMITTED'
  AND "submittedAt"::date = '2026-04-28';
