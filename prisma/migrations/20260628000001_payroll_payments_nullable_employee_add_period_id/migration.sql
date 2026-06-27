-- Migration: payroll_payments_nullable_employee_add_period_id
-- Makes employeeId nullable so aggregate records (ZIMRA_PAYE, NSSA, AIDS_LEVY)
-- can be stored without a specific employee.
-- Adds payrollPeriodId so all approval-generated records link back to their period.

-- 1. Make employeeId nullable
ALTER TABLE "payroll_account_payments" ALTER COLUMN "employeeId" DROP NOT NULL;

-- 2. Add payrollPeriodId column
ALTER TABLE "payroll_account_payments" ADD COLUMN "payrollPeriodId" TEXT;

-- 3. Index for period-based queries
CREATE INDEX "payroll_account_payments_payrollPeriodId_idx" ON "payroll_account_payments"("payrollPeriodId");
