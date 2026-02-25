-- Migration: add_supplier_payment_requests (MBM-127)
-- Adds: SupplierPaymentRequestStatus enum, supplier_payment_requests table,
--       supplier_payment_request_partials table,
--       4 flag columns on business_suppliers

-- Step 1: Add enum type
CREATE TYPE "SupplierPaymentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'PARTIAL', 'PAID');

-- Step 2: Add flag columns to business_suppliers
ALTER TABLE "business_suppliers"
  ADD COLUMN "hasSpecialInstructions" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "specialInstructions" TEXT,
  ADD COLUMN "posBlocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "discontinued" BOOLEAN NOT NULL DEFAULT false;

-- Step 3: Create supplier_payment_requests
CREATE TABLE "supplier_payment_requests" (
  "id"               TEXT NOT NULL,
  "businessId"       TEXT NOT NULL,
  "supplierId"       TEXT NOT NULL,
  "expenseAccountId" TEXT NOT NULL,
  "amount"           DECIMAL(12,2) NOT NULL,
  "dueDate"          TIMESTAMP(3) NOT NULL,
  "notes"            TEXT,
  "status"           "SupplierPaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "submittedBy"      TEXT NOT NULL,
  "submittedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedBy"       TEXT,
  "approvedAt"       TIMESTAMP(3),
  "deniedBy"         TEXT,
  "deniedAt"         TIMESTAMP(3),
  "denialNote"       TEXT,
  "paidAmount"       DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "supplier_payment_requests_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create supplier_payment_request_partials
CREATE TABLE "supplier_payment_request_partials" (
  "id"        TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amount"    DECIMAL(12,2) NOT NULL,
  "paidAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidBy"    TEXT NOT NULL,

  CONSTRAINT "supplier_payment_request_partials_pkey" PRIMARY KEY ("id")
);

-- Step 5: Foreign key constraints on supplier_payment_requests
ALTER TABLE "supplier_payment_requests"
  ADD CONSTRAINT "supplier_payment_requests_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_payment_requests_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "business_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_payment_requests_expenseAccountId_fkey"
    FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_payment_requests_submittedBy_fkey"
    FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_payment_requests_approvedBy_fkey"
    FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_payment_requests_deniedBy_fkey"
    FOREIGN KEY ("deniedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Foreign key constraints on supplier_payment_request_partials
ALTER TABLE "supplier_payment_request_partials"
  ADD CONSTRAINT "supplier_payment_request_partials_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "supplier_payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_payment_request_partials_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "expense_account_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_payment_request_partials_paidBy_fkey"
    FOREIGN KEY ("paidBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Indexes on supplier_payment_requests
CREATE INDEX "supplier_payment_requests_businessId_idx" ON "supplier_payment_requests"("businessId");
CREATE INDEX "supplier_payment_requests_supplierId_idx" ON "supplier_payment_requests"("supplierId");
CREATE INDEX "supplier_payment_requests_status_idx" ON "supplier_payment_requests"("status");
CREATE INDEX "supplier_payment_requests_submittedBy_idx" ON "supplier_payment_requests"("submittedBy");
CREATE INDEX "supplier_payment_requests_dueDate_idx" ON "supplier_payment_requests"("dueDate");
CREATE INDEX "supplier_payment_requests_expenseAccountId_idx" ON "supplier_payment_requests"("expenseAccountId");
CREATE INDEX "supplier_payment_requests_submittedAt_idx" ON "supplier_payment_requests"("submittedAt");

-- Step 8: Indexes on supplier_payment_request_partials
CREATE INDEX "supplier_payment_request_partials_requestId_idx" ON "supplier_payment_request_partials"("requestId");
CREATE INDEX "supplier_payment_request_partials_paymentId_idx" ON "supplier_payment_request_partials"("paymentId");
