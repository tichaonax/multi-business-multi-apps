-- Remove unique constraints from auto-generated sequential display number fields.
-- These numbers (supplierNumber, employeeNumber, orderNumber, etc.) are human-readable
-- labels only. Using them as unique keys breaks cross-machine restores and distributed
-- data merges because two independent servers can generate the same number for
-- completely different records. The GUID `id` is the true unique identity.

-- BusinessSuppliers: supplierNumber is a display label
ALTER TABLE "business_suppliers" DROP CONSTRAINT IF EXISTS "business_suppliers_businessType_supplierNumber_key";

-- Employees: employeeNumber is a display label
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_employeeNumber_key";

-- PayrollPaymentVouchers: voucherNumber is a display label
ALTER TABLE "payroll_payment_vouchers" DROP CONSTRAINT IF EXISTS "payroll_payment_vouchers_voucherNumber_key";

-- ExpenseAccountLoans: loanNumber is a display label
ALTER TABLE "expense_account_loans" DROP CONSTRAINT IF EXISTS "expense_account_loans_loannumber_key";

-- AccountOutgoingLoans: loanNumber is a display label
ALTER TABLE "account_outgoing_loans" DROP CONSTRAINT IF EXISTS "account_outgoing_loans_loanNumber_key";

-- InterBusinessLoans: loanNumber is a display label
ALTER TABLE "inter_business_loans" DROP CONSTRAINT IF EXISTS "inter_business_loans_loanNumber_key";

-- Orders (restaurant): orderNumber is a display label
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_orderNumber_key";

-- CustomerLayby: laybyNumber is a display label
ALTER TABLE "customer_laybys" DROP CONSTRAINT IF EXISTS "customer_laybys_laybyNumber_key";

-- CustomerLaybyPayments: receiptNumber is a display label
ALTER TABLE "customer_layby_payments" DROP CONSTRAINT IF EXISTS "customer_layby_payments_receiptNumber_key";

-- BusinessCustomers: customerNumber is a display label
ALTER TABLE "business_customers" DROP CONSTRAINT IF EXISTS "business_customers_businessId_customerNumber_key";

-- BusinessOrders: orderNumber is a display label (non-unique index kept for search performance)
ALTER TABLE "business_orders" DROP CONSTRAINT IF EXISTS "business_orders_businessId_orderNumber_key";

-- ProductVariants: sku is a display/scan label, not globally unique across machines
ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "product_variants_sku_key";

-- ClothingBales: sku is a display label
ALTER TABLE "clothing_bales" DROP CONSTRAINT IF EXISTS "clothing_bales_sku_key";
