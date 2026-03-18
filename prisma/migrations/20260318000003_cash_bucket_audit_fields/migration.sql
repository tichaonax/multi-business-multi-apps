-- Add audit trail fields to cash_bucket_entries
-- Supports soft-delete (amount set to 0, deletedAt populated) and edit tracking

ALTER TABLE "cash_bucket_entries"
  ADD COLUMN "editedAt"       TIMESTAMP(3),
  ADD COLUMN "editedBy"       TEXT,
  ADD COLUMN "deletedAt"      TIMESTAMP(3),
  ADD COLUMN "deletedBy"      TEXT,
  ADD COLUMN "deletionReason" TEXT;
