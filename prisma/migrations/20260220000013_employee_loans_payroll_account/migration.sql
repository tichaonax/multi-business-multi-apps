-- Migration: Employee loans from payroll account
--
-- AccountOutgoingLoans.expenseAccountId made nullable so EMPLOYEE loans
-- can be sourced from the payroll account instead of an expense account.
-- A new payrollAccountId column links EMPLOYEE loans to the payroll account.

-- Make expenseAccountId nullable (was required)
ALTER TABLE "account_outgoing_loans" ALTER COLUMN "expenseAccountId" DROP NOT NULL;

-- Add payrollAccountId FK (for EMPLOYEE loans only)
ALTER TABLE "account_outgoing_loans" ADD COLUMN "payrollAccountId" TEXT;
ALTER TABLE "account_outgoing_loans" ADD CONSTRAINT "account_outgoing_loans_payrollAccountId_fkey"
  FOREIGN KEY ("payrollAccountId") REFERENCES "payroll_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for payroll account lookups
CREATE INDEX "account_outgoing_loans_payrollAccountId_idx" ON "account_outgoing_loans"("payrollAccountId");
