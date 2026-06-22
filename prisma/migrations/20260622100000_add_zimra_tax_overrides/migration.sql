-- Add ZIMRA tax override columns to payroll_entries
-- These nullable columns store ZIMRA-calculator-sourced values that override system calculations.
-- NULL means no override; a value means use this instead of the system-calculated amount.

ALTER TABLE "payroll_entries"
  ADD COLUMN IF NOT EXISTS "zimraPaye"      DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "zimraNssa"      DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "zimraAidsLevy"  DECIMAL(12,2);
