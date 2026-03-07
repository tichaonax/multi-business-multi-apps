-- CreateEnum
CREATE TYPE "PettyCashStatus" AS ENUM ('PENDING', 'APPROVED', 'SETTLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "petty_cash_requests" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "expenseAccountId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "settledBy" TEXT,
    "cancelledBy" TEXT,
    "status" "PettyCashStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2),
    "returnAmount" DECIMAL(12,2),
    "purpose" TEXT NOT NULL,
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "depositId" TEXT,
    "businessTxId" TEXT,
    "returnPaymentId" TEXT,
    "returnTxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_requests_returnPaymentId_key" ON "petty_cash_requests"("returnPaymentId");

-- CreateIndex
CREATE INDEX "petty_cash_requests_businessId_idx" ON "petty_cash_requests"("businessId");

-- CreateIndex
CREATE INDEX "petty_cash_requests_requestedBy_idx" ON "petty_cash_requests"("requestedBy");

-- CreateIndex
CREATE INDEX "petty_cash_requests_status_idx" ON "petty_cash_requests"("status");

-- CreateIndex
CREATE INDEX "petty_cash_requests_requestedAt_idx" ON "petty_cash_requests"("requestedAt" DESC);

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "expense_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_settledBy_fkey" FOREIGN KEY ("settledBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petty_cash_requests" ADD CONSTRAINT "petty_cash_requests_returnPaymentId_fkey" FOREIGN KEY ("returnPaymentId") REFERENCES "expense_account_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed system permissions
INSERT INTO "permissions" ("id", "name", "description", "category", "isSystemPermission", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'petty_cash.request', 'Submit petty cash requests for a business', 'petty_cash', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'petty_cash.approve', 'Approve, settle, and manage petty cash requests', 'petty_cash', true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
