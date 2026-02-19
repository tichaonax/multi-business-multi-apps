-- Add payeeSupplierId column to expense_account_payments
ALTER TABLE "expense_account_payments" ADD COLUMN IF NOT EXISTS "payeeSupplierId" TEXT;

-- Add foreign key constraint to business_suppliers
ALTER TABLE "expense_account_payments"
  ADD CONSTRAINT "expense_account_payments_payeeSupplierId_fkey"
  FOREIGN KEY ("payeeSupplierId")
  REFERENCES "business_suppliers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
