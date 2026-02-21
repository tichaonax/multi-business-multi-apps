-- Add netAmount to payroll_account_payments
-- netAmount = what the employee actually receives (nettPay after all deductions)
-- amount stays as gross (used for payroll account balance debit)
ALTER TABLE "payroll_account_payments"
  ADD COLUMN "netAmount" DECIMAL(12,2);
