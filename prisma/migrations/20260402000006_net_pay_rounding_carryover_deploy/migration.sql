-- Deploy net pay rounding carryover columns (idempotent)
-- Migration 000005 was registered but SQL was not executed; using IF NOT EXISTS to be safe on all environments.

ALTER TABLE "payroll_entries"
  ADD COLUMN IF NOT EXISTS "carryoverIn"   DECIMAL(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "carryoverOut"  DECIMAL(8,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "roundedNetPay" DECIMAL(12,2);

CREATE INDEX IF NOT EXISTS "payroll_entries_rounding_lookup_idx"
  ON "payroll_entries" ("employeeId", "payrollPeriodId");
