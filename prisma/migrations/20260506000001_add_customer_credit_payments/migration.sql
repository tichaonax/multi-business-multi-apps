-- Add openingCreditBalance to delivery_order_meta
-- Stores balance before deduction so receipts can show opening + closing balance
ALTER TABLE "delivery_order_meta"
  ADD COLUMN "openingCreditBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Create restaurant_credit_payments table
-- Records credit deductions for dine-in and takeaway orders
-- (Delivery credit is already tracked in delivery_order_meta)
CREATE TABLE "restaurant_credit_payments" (
  "id"             TEXT         NOT NULL,
  "orderId"        TEXT         NOT NULL,
  "customerId"     TEXT         NOT NULL,
  "businessId"     TEXT         NOT NULL,
  "openingBalance" DECIMAL(10,2) NOT NULL,
  "creditUsed"     DECIMAL(10,2) NOT NULL,
  "closingBalance" DECIMAL(10,2) NOT NULL,
  "changeToCredit" DECIMAL(10,2),
  "orderType"      TEXT         NOT NULL,
  "createdBy"      TEXT         NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "restaurant_credit_payments_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one credit payment record per order
ALTER TABLE "restaurant_credit_payments"
  ADD CONSTRAINT "restaurant_credit_payments_orderId_key" UNIQUE ("orderId");

-- Foreign keys
ALTER TABLE "restaurant_credit_payments"
  ADD CONSTRAINT "restaurant_credit_payments_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "business_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "restaurant_credit_payments"
  ADD CONSTRAINT "restaurant_credit_payments_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "business_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "restaurant_credit_payments"
  ADD CONSTRAINT "restaurant_credit_payments_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "restaurant_credit_payments_customerId_idx" ON "restaurant_credit_payments"("customerId");
CREATE INDEX "restaurant_credit_payments_businessId_idx" ON "restaurant_credit_payments"("businessId");
