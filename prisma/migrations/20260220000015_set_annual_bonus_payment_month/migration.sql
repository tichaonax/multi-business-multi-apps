-- Set paymentMonth = 11 (November) for any benefit type whose name contains "Annual Bonus"
-- This ensures Annual Bonus is filtered out in non-November payroll periods.
UPDATE "benefit_types"
SET "paymentMonth" = 11
WHERE lower("name") LIKE '%annual%bonus%'
  AND "paymentMonth" IS NULL;
