-- CreateEnum
CREATE TYPE "public"."LaybyStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'DEFAULTED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "public"."InstallmentFrequency" AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "public"."customer_laybys" (
    "id" TEXT NOT NULL,
    "laybyNumber" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" "public"."LaybyStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "depositAmount" DECIMAL(12,2) NOT NULL,
    "depositPercent" DECIMAL(5,2) NOT NULL,
    "balanceRemaining" DECIMAL(12,2) NOT NULL,
    "totalPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "installmentAmount" DECIMAL(12,2),
    "installmentFrequency" "public"."InstallmentFrequency",
    "paymentDueDate" TIMESTAMP(3),
    "completionDueDate" TIMESTAMP(3),
    "serviceFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lateFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "administrationFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalFees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "items" JSONB NOT NULL,
    "itemsReleased" BOOLEAN NOT NULL DEFAULT false,
    "itemsReleasedAt" TIMESTAMP(3),
    "itemsReleasedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancellationRefund" DECIMAL(12,2),

    CONSTRAINT "customer_laybys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_layby_payments" (
    "id" TEXT NOT NULL,
    "laybyId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "paymentReference" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedBy" TEXT NOT NULL,
    "notes" TEXT,
    "isRefund" BOOLEAN NOT NULL DEFAULT false,
    "refundedPaymentId" TEXT,

    CONSTRAINT "customer_layby_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_laybys_laybyNumber_key" ON "public"."customer_laybys"("laybyNumber");

-- CreateIndex
CREATE INDEX "customer_laybys_businessId_idx" ON "public"."customer_laybys"("businessId");

-- CreateIndex
CREATE INDEX "customer_laybys_customerId_idx" ON "public"."customer_laybys"("customerId");

-- CreateIndex
CREATE INDEX "customer_laybys_status_idx" ON "public"."customer_laybys"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_layby_payments_receiptNumber_key" ON "public"."customer_layby_payments"("receiptNumber");

-- CreateIndex
CREATE INDEX "customer_layby_payments_laybyId_idx" ON "public"."customer_layby_payments"("laybyId");

-- AddForeignKey
ALTER TABLE "public"."customer_laybys" ADD CONSTRAINT "customer_laybys_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_laybys" ADD CONSTRAINT "customer_laybys_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."business_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_laybys" ADD CONSTRAINT "customer_laybys_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_layby_payments" ADD CONSTRAINT "customer_layby_payments_laybyId_fkey" FOREIGN KEY ("laybyId") REFERENCES "public"."customer_laybys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_layby_payments" ADD CONSTRAINT "customer_layby_payments_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_layby_payments" ADD CONSTRAINT "customer_layby_payments_refundedPaymentId_fkey" FOREIGN KEY ("refundedPaymentId") REFERENCES "public"."customer_layby_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
