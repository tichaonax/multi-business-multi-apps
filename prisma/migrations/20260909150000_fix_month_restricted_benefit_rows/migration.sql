-- Data-fix migration: remove payroll_entry_benefits rows that violate their
-- own BenefitType's paymentMonth restriction (e.g. an "Annual Bonus" with
-- paymentMonth=11 persisted into a March or June payroll period instead of
-- only November).
--
-- Root cause (fixed in application code alongside this migration, in
-- POST /api/payroll/periods/[periodId]/sync-benefits): that endpoint copied
-- every contract benefit into every period it synced, with no paymentMonth
-- check at all, so a month-restricted benefit was persisted into every
-- period regardless of month.
--
-- Scope is deliberately narrow and objective: a row is only touched here if
-- it exists in a period whose month does not match its own BenefitType's
-- paymentMonth. Rows for benefit types with no month restriction
-- (paymentMonth IS NULL) are never touched, regardless of their amount --
-- there is no reliable way to distinguish an intentional flat manual
-- override (e.g. a one-off performance bonus) from a miscalculated
-- percentage using persisted data alone, so those are left alone rather
-- than guessed at.

BEGIN;

-- Bad rows, computed once into a temp table so steps 2 and 3 below reference
-- exactly the same set the DELETE in step 2 will remove.
CREATE TEMP TABLE _bad_benefit_rows ON COMMIT DROP AS
SELECT peb.id, peb."payrollEntryId", peb."isActive"
FROM payroll_entry_benefits peb
JOIN benefit_types bt ON bt.id = peb."benefitTypeId"
JOIN payroll_entries pe ON pe.id = peb."payrollEntryId"
JOIN payroll_periods pp ON pp.id = pe."payrollPeriodId"
WHERE bt."paymentMonth" IS NOT NULL
  AND bt."paymentMonth" <> pp.month;

-- Entries that will lose an ACTIVE bad row need their stored totals
-- recomputed -- inactive bad rows already contribute 0 to any existing
-- total (recalculateEntryTotals only sums isActive rows), so no entry needs
-- recomputing solely because of those.
CREATE TEMP TABLE _affected_entries ON COMMIT DROP AS
SELECT DISTINCT "payrollEntryId" AS entry_id
FROM _bad_benefit_rows
WHERE "isActive" = true;

-- 1) Recompute each affected entry's totals from its OTHER remaining active
--    benefit rows (i.e. excluding the ones about to be deleted).
WITH recomputed AS (
  SELECT
    pe.id AS entry_id,
    pe."baseSalary" + pe.commission + pe."overtimePay" + pe."adjustmentsTotal"
      + COALESCE(SUM(peb.amount) FILTER (
          WHERE peb."isActive" = true
            AND peb.id NOT IN (SELECT id FROM _bad_benefit_rows)
            AND peb."entryType" <> 'deduction'
        ), 0) AS new_gross_pay,
    pe."advanceDeductions" + pe."loanDeductions" + pe."miscDeductions"
      + COALESCE(SUM(peb.amount) FILTER (
          WHERE peb."isActive" = true
            AND peb.id NOT IN (SELECT id FROM _bad_benefit_rows)
            AND peb."entryType" = 'deduction'
        ), 0) AS new_total_deductions,
    COALESCE(SUM(peb.amount) FILTER (
        WHERE peb."isActive" = true
          AND peb.id NOT IN (SELECT id FROM _bad_benefit_rows)
          AND peb."entryType" <> 'deduction'
      ), 0) AS new_benefits_total
  FROM payroll_entries pe
  LEFT JOIN payroll_entry_benefits peb ON peb."payrollEntryId" = pe.id
  WHERE pe.id IN (SELECT entry_id FROM _affected_entries)
  GROUP BY pe.id, pe."baseSalary", pe.commission, pe."overtimePay", pe."adjustmentsTotal",
           pe."advanceDeductions", pe."loanDeductions", pe."miscDeductions"
)
UPDATE payroll_entries pe
SET "benefitsTotal" = r.new_benefits_total,
    "grossPay" = r.new_gross_pay,
    "totalDeductions" = r.new_total_deductions,
    "netPay" = r.new_gross_pay - r.new_total_deductions,
    "updatedAt" = NOW()
FROM recomputed r
WHERE pe.id = r.entry_id;

-- 2) Delete the erroneous rows themselves.
DELETE FROM payroll_entry_benefits
WHERE id IN (SELECT id FROM _bad_benefit_rows);

-- 3) Recompute aggregate totals for any payroll_periods containing an
--    entry touched in step 1.
WITH period_totals AS (
  SELECT pe."payrollPeriodId" AS period_id,
         SUM(pe."grossPay") AS total_gross_pay,
         SUM(pe."totalDeductions") AS total_deductions,
         SUM(pe."netPay") AS total_net_pay
  FROM payroll_entries pe
  WHERE pe."payrollPeriodId" IN (
    SELECT DISTINCT pe2."payrollPeriodId"
    FROM payroll_entries pe2
    WHERE pe2.id IN (SELECT entry_id FROM _affected_entries)
  )
  GROUP BY pe."payrollPeriodId"
)
UPDATE payroll_periods pp
SET "totalGrossPay" = pt.total_gross_pay,
    "totalDeductions" = pt.total_deductions,
    "totalNetPay" = pt.total_net_pay,
    "updatedAt" = NOW()
FROM period_totals pt
WHERE pp.id = pt.period_id;

COMMIT;
