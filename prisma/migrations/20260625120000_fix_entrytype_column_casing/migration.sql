-- Fix: ensure entryType column has correct mixed-case name on all environments.
-- The previous migration (20260625100000) may have created the column as 'entry_type'
-- on dev before its SQL was corrected. This migration renames it to "entryType" if needed.
-- On production (fresh apply of corrected 20260625100000), the column already exists as
-- "entryType" and all three branches below are skipped (no-op).
DO $$
BEGIN
  -- Column was created as entry_type (original snake_case SQL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payroll_entry_benefits' AND column_name = 'entry_type'
  ) THEN
    ALTER TABLE "payroll_entry_benefits" RENAME COLUMN "entry_type" TO "entryType";

  -- Column was renamed without quoting, so PostgreSQL folded it to lowercase entrytype
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payroll_entry_benefits' AND column_name = 'entrytype'
  ) THEN
    ALTER TABLE "payroll_entry_benefits" RENAME COLUMN "entrytype" TO "entryType";

  -- Column is completely absent (edge case: add it)
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payroll_entry_benefits' AND column_name = 'entryType'
  ) THEN
    ALTER TABLE "payroll_entry_benefits" ADD COLUMN "entryType" TEXT NOT NULL DEFAULT 'benefit';
  END IF;
END $$;
