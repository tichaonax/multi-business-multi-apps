-- Add one-time amendment tracking fields to saved_reports.
-- All columns are nullable: NULL means the report has never been amended.

ALTER TABLE saved_reports
  ADD COLUMN IF NOT EXISTS "originalCashCounted"       DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "cashCountedModifiedAt"     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "cashCountedModifiedById"   TEXT,
  ADD COLUMN IF NOT EXISTS "cashCountedModifiedByName" TEXT,
  ADD COLUMN IF NOT EXISTS "cashCountedModifiedReason" TEXT;
