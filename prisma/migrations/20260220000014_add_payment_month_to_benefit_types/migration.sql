-- Add paymentMonth to benefit_types
-- If set (1-12), this benefit is only paid in that specific calendar month.
-- e.g. 11 = November only (Annual Bonus). NULL = paid every month.
ALTER TABLE "benefit_types" ADD COLUMN IF NOT EXISTS "paymentMonth" INTEGER;
