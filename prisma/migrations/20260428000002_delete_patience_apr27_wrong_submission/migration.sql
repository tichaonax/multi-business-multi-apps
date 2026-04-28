-- Migration: delete Patience Chimedza's incorrect Apr 27 SUBMITTED EOD record
--
-- What happened:
--   On Apr 28, when Patience submitted her EOD via /eod/submit, the client correctly
--   sent reportDate='2026-04-28'. However, the Prisma @db.Date serialization bug
--   (server in Africa/Harare UTC+2: midnight Harare = Apr 27 22:00 UTC, Prisma uses
--   UTC date → sends '2026-04-27' to the DB) stored the record as Apr 27 instead
--   of Apr 28. The amounts ($26.20 cash) were Apr 28 data but landed on Apr 27.
--   The manager already signed off the Apr 27 EOD (total $44.60, locked).
--   Patience will now submit Apr 28 correctly via the fixed pending route.
--
-- Guards (all must be true):
--   businessId    = Mvimvi Groceries
--   salespersonId = Patience Chimedza
--   reportDate    = 2026-04-27  (wrong date — should have been Apr 28)
--   status        = SUBMITTED   (not a phantom PENDING — handled by migration 20260428000001)
--   submittedAt on Apr 28 (submitted today, after the report date — the tell-tale sign)

DELETE FROM salesperson_eod_reports
WHERE "businessId"    = '8015cfa3-f26e-4667-be70-87fbeaba6455'
  AND "salespersonId" = '4983271b-6fdb-4976-990a-db0fe969fcad'
  AND "reportDate"    = '2026-04-27'
  AND status          = 'SUBMITTED'
  AND "submittedAt"::date = '2026-04-28';
