-- Add QUEUED status to SupplierPaymentRequestStatus enum
ALTER TYPE "SupplierPaymentRequestStatus" ADD VALUE IF NOT EXISTS 'QUEUED';

-- Add queue tracking fields to supplier_payment_requests
ALTER TABLE "supplier_payment_requests"
  ADD COLUMN IF NOT EXISTS "queuedBy"        TEXT,
  ADD COLUMN IF NOT EXISTS "queuedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "linkedPaymentId" TEXT;
