-- MBM-182: Add expense classification columns to custom_bulk_products
ALTER TABLE "custom_bulk_products"
  ADD COLUMN IF NOT EXISTS "expenseDomainId"      VARCHAR,
  ADD COLUMN IF NOT EXISTS "expenseCategoryId"    VARCHAR,
  ADD COLUMN IF NOT EXISTS "expenseSubcategoryId" VARCHAR;
