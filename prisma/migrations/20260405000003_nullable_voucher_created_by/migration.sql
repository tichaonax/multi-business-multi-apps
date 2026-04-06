-- Make created_by_id nullable on expense_payment_vouchers
-- so admin users without an employee profile can still create vouchers

ALTER TABLE "expense_payment_vouchers"
  ALTER COLUMN "created_by_id" DROP NOT NULL;
