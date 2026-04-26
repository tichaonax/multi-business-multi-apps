-- CreateEnum
CREATE TYPE "ManagerOverrideAction" AS ENUM ('ORDER_CANCELLATION');

-- CreateEnum
CREATE TYPE "OverrideOutcome" AS ENUM ('APPROVED', 'DENIED', 'ABORTED', 'FAILED_CODE');

-- CreateTable
CREATE TABLE "manager_override_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_override_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_override_code_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "retiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_override_code_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_override_logs" (
    "id" TEXT NOT NULL,
    "managerId" TEXT,
    "action" "ManagerOverrideAction" NOT NULL,
    "outcome" "OverrideOutcome" NOT NULL,
    "targetId" TEXT NOT NULL,
    "businessId" TEXT,
    "requestedBy" TEXT NOT NULL,
    "staffReason" TEXT NOT NULL,
    "denialReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "manager_override_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_cancellations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "overrideLogId" TEXT NOT NULL,
    "staffReason" TEXT NOT NULL,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "feeDeducted" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manager_override_codes_userId_key" ON "manager_override_codes"("userId");

-- CreateIndex
CREATE INDEX "manager_override_code_history_userId_retiredAt_idx" ON "manager_override_code_history"("userId", "retiredAt");

-- CreateIndex
CREATE INDEX "manager_override_logs_targetId_idx" ON "manager_override_logs"("targetId");

-- CreateIndex
CREATE INDEX "manager_override_logs_businessId_createdAt_idx" ON "manager_override_logs"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "manager_override_logs_requestedBy_idx" ON "manager_override_logs"("requestedBy");

-- CreateIndex
CREATE UNIQUE INDEX "order_cancellations_orderId_key" ON "order_cancellations"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "order_cancellations_overrideLogId_key" ON "order_cancellations"("overrideLogId");

-- CreateIndex
CREATE INDEX "order_cancellations_businessId_createdAt_idx" ON "order_cancellations"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "order_cancellations_customerId_idx" ON "order_cancellations"("customerId");

-- AddForeignKey
ALTER TABLE "manager_override_codes" ADD CONSTRAINT "manager_override_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_override_code_history" ADD CONSTRAINT "manager_override_code_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_override_logs" ADD CONSTRAINT "manager_override_logs_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_override_logs" ADD CONSTRAINT "manager_override_logs_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_override_logs" ADD CONSTRAINT "manager_override_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_cancellations" ADD CONSTRAINT "order_cancellations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "business_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_cancellations" ADD CONSTRAINT "order_cancellations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_cancellations" ADD CONSTRAINT "order_cancellations_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_cancellations" ADD CONSTRAINT "order_cancellations_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_cancellations" ADD CONSTRAINT "order_cancellations_overrideLogId_fkey" FOREIGN KEY ("overrideLogId") REFERENCES "manager_override_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_cancellations" ADD CONSTRAINT "order_cancellations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
