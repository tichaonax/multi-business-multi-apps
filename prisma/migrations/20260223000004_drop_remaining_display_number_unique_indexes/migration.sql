-- Fix: previous migration used DROP CONSTRAINT but Prisma creates these as standalone
-- unique indexes (not named constraints), so DROP CONSTRAINT was a no-op.
-- These are all display/label fields — not true unique identifiers — and must not
-- block cross-server restores where two servers can legitimately generate the same
-- display number for different records (different GUIDs).

DROP INDEX IF EXISTS "business_orders_businessId_orderNumber_key";
DROP INDEX IF EXISTS "business_customers_businessId_customerNumber_key";
DROP INDEX IF EXISTS "employees_employeeNumber_key";
DROP INDEX IF EXISTS "inter_business_loans_loanNumber_key";
DROP INDEX IF EXISTS "account_outgoing_loans_loanNumber_key";
DROP INDEX IF EXISTS "payroll_payment_vouchers_voucherNumber_key";
DROP INDEX IF EXISTS "orders_orderNumber_key";
DROP INDEX IF EXISTS "customer_laybys_laybyNumber_key";
DROP INDEX IF EXISTS "customer_layby_payments_receiptNumber_key";
DROP INDEX IF EXISTS "product_variants_sku_key";
DROP INDEX IF EXISTS "clothing_bales_sku_key";
