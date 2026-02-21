-- Add sign/complete audit fields and updatedAt to payroll_account_payments
ALTER TABLE "payroll_account_payments"
  ADD COLUMN "signedBy"    TEXT,
  ADD COLUMN "signedAt"    TIMESTAMP(3),
  ADD COLUMN "completedBy" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add FK constraints for signedBy and completedBy
ALTER TABLE "payroll_account_payments"
  ADD CONSTRAINT "payroll_account_payments_signedBy_fkey"
    FOREIGN KEY ("signedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "payroll_account_payments_completedBy_fkey"
    FOREIGN KEY ("completedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create payroll_payment_vouchers table
CREATE TABLE "payroll_payment_vouchers" (
  "id"                 TEXT          NOT NULL,
  "paymentId"          TEXT          NOT NULL,
  "voucherNumber"      TEXT          NOT NULL,
  "employeeNumber"     TEXT          NOT NULL,
  "employeeName"       TEXT          NOT NULL,
  "employeeNationalId" TEXT,
  "amount"             DECIMAL(12,2) NOT NULL,
  "paymentDate"        TIMESTAMP(3)  NOT NULL,
  "issuedAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes"              TEXT,
  "signatureData"      TEXT,
  "signedAt"           TIMESTAMP(3),
  "regenerationCount"  INTEGER       NOT NULL DEFAULT 0,
  "lastRegeneratedAt"  TIMESTAMP(3),
  CONSTRAINT "payroll_payment_vouchers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payroll_payment_vouchers_voucherNumber_key"
  ON "payroll_payment_vouchers"("voucherNumber");

CREATE INDEX "payroll_payment_vouchers_paymentId_idx"
  ON "payroll_payment_vouchers"("paymentId");

ALTER TABLE "payroll_payment_vouchers"
  ADD CONSTRAINT "payroll_payment_vouchers_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "payroll_account_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
