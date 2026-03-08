-- MBM-141: Add EOD Payment Batch workflow
-- Creates eod_payment_batches table and adds new columns to existing tables

-- Create eod_payment_batches table
CREATE TABLE "eod_payment_batches" (
  "id"             TEXT NOT NULL,
  "businessId"     TEXT NOT NULL,
  "eodDate"        DATE NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewedBy"     TEXT,
  "reviewedAt"     TIMESTAMP(3),
  "approvedCount"  INTEGER NOT NULL DEFAULT 0,
  "rejectedCount"  INTEGER NOT NULL DEFAULT 0,
  "totalApproved"  DECIMAL(12,2),
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eod_payment_batches_pkey" PRIMARY KEY ("id")
);

-- Add eodBatchId, adHoc, cancelledAt to expense_account_payments
ALTER TABLE "expense_account_payments" ADD COLUMN "eod_batch_id"   TEXT;
ALTER TABLE "expense_account_payments" ADD COLUMN "ad_hoc"         BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "expense_account_payments" ADD COLUMN "cancelled_at"   TIMESTAMP(3);

-- Add eodBatchId to payment_batch_submissions
ALTER TABLE "payment_batch_submissions" ADD COLUMN "eod_batch_id" TEXT;
ALTER TABLE "payment_batch_submissions" ADD CONSTRAINT "payment_batch_submissions_eod_batch_id_key" UNIQUE ("eod_batch_id");

-- Indexes on eod_payment_batches
CREATE INDEX "eod_payment_batches_businessId_idx" ON "eod_payment_batches"("businessId");
CREATE INDEX "eod_payment_batches_eodDate_idx"    ON "eod_payment_batches"("eodDate");
CREATE INDEX "eod_payment_batches_status_idx"     ON "eod_payment_batches"("status");

-- Index on expense_account_payments.eod_batch_id
CREATE INDEX "expense_account_payments_eod_batch_id_idx" ON "expense_account_payments"("eod_batch_id");

-- Foreign keys
ALTER TABLE "eod_payment_batches" ADD CONSTRAINT "eod_payment_batches_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "eod_payment_batches" ADD CONSTRAINT "eod_payment_batches_reviewedBy_fkey"
  FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expense_account_payments" ADD CONSTRAINT "expense_account_payments_eod_batch_id_fkey"
  FOREIGN KEY ("eod_batch_id") REFERENCES "eod_payment_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_batch_submissions" ADD CONSTRAINT "payment_batch_submissions_eod_batch_id_fkey"
  FOREIGN KEY ("eod_batch_id") REFERENCES "eod_payment_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
