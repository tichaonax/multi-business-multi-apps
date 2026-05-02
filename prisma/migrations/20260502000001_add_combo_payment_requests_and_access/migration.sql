-- MBM-197: Combo Payment Requests & Restricted Expense Account Access

-- CreateEnum
CREATE TYPE "ComboPaymentRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ComboPaymentRequestSectionType" AS ENUM ('GROCERY', 'MONTHLY_CONTRIBUTION', 'SCHOOL_FEES', 'CUSTOM');

-- CreateTable
CREATE TABLE "combo_payment_requests" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ComboPaymentRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overrideAmount" DECIMAL(12,2),
    "approvedAmount" DECIMAL(12,2),
    "approvalNote" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "linked_payment_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combo_payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_payment_request_sections" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sectionType" "ComboPaymentRequestSectionType" NOT NULL,
    "sectionName" TEXT,
    "payeeType" TEXT,
    "payeePersonId" TEXT,
    "payeeUserId" TEXT,
    "payeeEmployeeId" TEXT,
    "payeeBusinessId" TEXT,
    "payeeSupplierId" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combo_payment_request_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_payment_request_items" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sectionId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3),
    "unit" TEXT,
    "estimatedAmount" DECIMAL(12,2),
    "approvedAmount" DECIMAL(12,2),
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "payeeType" TEXT,
    "payeePersonId" TEXT,
    "payeeUserId" TEXT,
    "payeeEmployeeId" TEXT,
    "payeeBusinessId" TEXT,
    "payeeSupplierId" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(12,2),
    "receiptNumber" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combo_payment_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_account_user_access" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canCreateRequests" BOOLEAN NOT NULL DEFAULT true,
    "canViewOwnOnly" BOOLEAN NOT NULL DEFAULT true,
    "canViewBalance" BOOLEAN NOT NULL DEFAULT false,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_account_user_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "combo_payment_requests_linked_payment_id_key" ON "combo_payment_requests"("linked_payment_id");

-- CreateIndex
CREATE INDEX "combo_payment_requests_accountId_status_idx" ON "combo_payment_requests"("accountId", "status");

-- CreateIndex
CREATE INDEX "combo_payment_requests_createdBy_idx" ON "combo_payment_requests"("createdBy");

-- CreateIndex
CREATE INDEX "combo_payment_requests_createdAt_idx" ON "combo_payment_requests"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "combo_payment_request_sections_requestId_idx" ON "combo_payment_request_sections"("requestId");

-- CreateIndex
CREATE INDEX "combo_payment_request_items_requestId_idx" ON "combo_payment_request_items"("requestId");

-- CreateIndex
CREATE INDEX "combo_payment_request_items_sectionId_idx" ON "combo_payment_request_items"("sectionId");

-- CreateIndex
CREATE INDEX "expense_account_user_access_userId_idx" ON "expense_account_user_access"("userId");

-- CreateIndex
CREATE INDEX "expense_account_user_access_accountId_isActive_idx" ON "expense_account_user_access"("accountId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "expense_account_user_access_accountId_userId_key" ON "expense_account_user_access"("accountId", "userId");

-- AddForeignKey
ALTER TABLE "combo_payment_requests" ADD CONSTRAINT "combo_payment_requests_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "expense_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_requests" ADD CONSTRAINT "combo_payment_requests_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_requests" ADD CONSTRAINT "combo_payment_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_requests" ADD CONSTRAINT "combo_payment_requests_linked_payment_id_fkey" FOREIGN KEY ("linked_payment_id") REFERENCES "expense_account_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_sections" ADD CONSTRAINT "combo_payment_request_sections_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "combo_payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_sections" ADD CONSTRAINT "combo_payment_request_sections_payeePersonId_fkey" FOREIGN KEY ("payeePersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_sections" ADD CONSTRAINT "combo_payment_request_sections_payeeUserId_fkey" FOREIGN KEY ("payeeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_sections" ADD CONSTRAINT "combo_payment_request_sections_payeeEmployeeId_fkey" FOREIGN KEY ("payeeEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_sections" ADD CONSTRAINT "combo_payment_request_sections_payeeBusinessId_fkey" FOREIGN KEY ("payeeBusinessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_sections" ADD CONSTRAINT "combo_payment_request_sections_payeeSupplierId_fkey" FOREIGN KEY ("payeeSupplierId") REFERENCES "business_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_items" ADD CONSTRAINT "combo_payment_request_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "combo_payment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_items" ADD CONSTRAINT "combo_payment_request_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "combo_payment_request_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_items" ADD CONSTRAINT "combo_payment_request_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_items" ADD CONSTRAINT "combo_payment_request_items_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "expense_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_items" ADD CONSTRAINT "combo_payment_request_items_payeePersonId_fkey" FOREIGN KEY ("payeePersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_items" ADD CONSTRAINT "combo_payment_request_items_payeeUserId_fkey" FOREIGN KEY ("payeeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_items" ADD CONSTRAINT "combo_payment_request_items_payeeEmployeeId_fkey" FOREIGN KEY ("payeeEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_items" ADD CONSTRAINT "combo_payment_request_items_payeeBusinessId_fkey" FOREIGN KEY ("payeeBusinessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_payment_request_items" ADD CONSTRAINT "combo_payment_request_items_payeeSupplierId_fkey" FOREIGN KEY ("payeeSupplierId") REFERENCES "business_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_account_user_access" ADD CONSTRAINT "expense_account_user_access_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "expense_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_account_user_access" ADD CONSTRAINT "expense_account_user_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_account_user_access" ADD CONSTRAINT "expense_account_user_access_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
