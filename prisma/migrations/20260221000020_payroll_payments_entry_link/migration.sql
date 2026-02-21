-- Add payrollEntryId and notes to payroll_account_payments
ALTER TABLE "payroll_account_payments"
  ADD COLUMN "payrollEntryId" TEXT,
  ADD COLUMN "notes"          TEXT;

CREATE INDEX "payroll_account_payments_payrollEntryId_idx"
  ON "payroll_account_payments"("payrollEntryId");
