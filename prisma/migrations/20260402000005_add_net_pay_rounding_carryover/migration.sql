-- Add net pay rounding carryover columns to payroll_entries
-- carryoverIn:    decimal fraction brought in from the previous period for this employee+business
-- carryoverOut:   decimal fraction owed after rounding this period (becomes carryoverIn next period)
-- roundedNetPay:  whole-dollar net pay after applying carryover (set on approval; null = not yet computed)

ALTER TABLE "payroll_entries"
  ADD COLUMN "carryoverIn"    DECIMAL(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN "carryoverOut"   DECIMAL(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN "roundedNetPay"  DECIMAL(12,2);

-- Index to efficiently look up most-recent carryoverOut per (employeeId, businessId)
CREATE INDEX "payroll_entries_rounding_lookup_idx"
  ON "payroll_entries" ("employeeId", "payrollPeriodId");
