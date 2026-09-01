-- Data fix (no schema change): one payroll period was created for August
-- 2026 when it was actually meant to be July 2026's payroll — created
-- 2026-08-05, right after July ended, before this app enforced that a
-- payroll period can only be created for a month that has already fully
-- completed (see POST /api/payroll/periods's new validation, added
-- alongside this migration). At the time, "current month" (August, still
-- in progress) was mistakenly left selected instead of switching back to
-- July.
--
-- Identifies the business by its role (isUmbrellaBusiness = true), not a
-- copied id literal — this app's own convention (see the business-dropdown
-- rule elsewhere in the codebase) is that exactly one business ever carries
-- that flag, so this resolves correctly against any environment with that
-- same structure, rather than assuming a specific id string happens to
-- match between the database this was authored against and wherever it's
-- actually deployed. Bails out (no-op) if that assumption doesn't hold —
-- zero or more than one umbrella business found — rather than guessing.
--
-- Beyond that, still targeted narrowly at the exact known-bad row
-- (business + year + month + exact periodStart/periodEnd) rather than any
-- generic date pattern — a correctly-created August period for some OTHER
-- business would have the identical periodStart/periodEnd shape and must
-- never be touched by this. Guarded to be a no-op if the row doesn't match
-- exactly as found (already fixed, or this environment never had the
-- anomaly), and guarded against the (businessId, year, month) unique
-- constraint in case a real July period already exists for this business
-- by the time this runs elsewhere.
--
-- Scope, confirmed by reading (read-only) the production data before
-- writing this: payroll_entries and payroll_slips carry no independent
-- year/month of their own — only a payrollPeriodId FK — so correcting the
-- period row alone fixes what they display. payroll_exports does carry its
-- own denormalized year/month/includesMonths and is corrected here too.
-- The already-generated export file itself (named "..._Aug_....xlsx") and
-- its fileName/fileUrl are deliberately left untouched — a historical
-- artifact of what was actually generated on 2026-08-05, not something this
-- migration should silently rewrite.

DO $$
DECLARE
  v_business_id TEXT;
  v_umbrella_count INT;
  v_period_id TEXT;
BEGIN
  SELECT COUNT(*) INTO v_umbrella_count FROM businesses WHERE "isUmbrellaBusiness" = true;

  IF v_umbrella_count = 0 THEN
    RAISE NOTICE 'No umbrella business found — skipping (not applicable in this environment).';
    RETURN;
  END IF;

  IF v_umbrella_count > 1 THEN
    RAISE NOTICE 'More than one umbrella business found (%) — skipping rather than guessing which one this fix applies to.', v_umbrella_count;
    RETURN;
  END IF;

  SELECT id INTO v_business_id FROM businesses WHERE "isUmbrellaBusiness" = true;

  SELECT p.id INTO v_period_id
  FROM payroll_periods p
  WHERE p."businessId" = v_business_id
    AND p.year = 2026
    AND p.month = 8
    AND p."periodStart" = '2026-08-01 00:00:00'::timestamp
    AND p."periodEnd" = '2026-08-31 00:00:00'::timestamp
    AND NOT EXISTS (
      SELECT 1 FROM payroll_periods p2
      WHERE p2."businessId" = p."businessId" AND p2.year = 2026 AND p2.month = 7
    );

  IF v_period_id IS NOT NULL THEN
    UPDATE payroll_periods
    SET year = 2026,
        month = 7,
        "periodStart" = '2026-07-01 00:00:00'::timestamp,
        "periodEnd" = '2026-07-31 00:00:00'::timestamp,
        "updatedAt" = NOW()
    WHERE id = v_period_id;

    UPDATE payroll_exports
    SET year = 2026,
        month = 7,
        "includesMonths" = ARRAY[7]
    WHERE "payrollPeriodId" = v_period_id;

    RAISE NOTICE 'Corrected mislabeled payroll period % from August 2026 to July 2026 (and its export record)', v_period_id;
  ELSE
    RAISE NOTICE 'No matching mislabeled August 2026 payroll period found for the umbrella business — skipping (already fixed, or not applicable in this environment).';
  END IF;
END $$;
