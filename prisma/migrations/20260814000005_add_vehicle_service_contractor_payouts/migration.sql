-- MBM-261 Phase 6: monthly contractor payment voucher tracking
-- One payout links to one ExpenseAccountPayments voucher; each payout item pins a
-- single task's labour to that voucher (unique on taskId — a task's labour can only
-- ever be paid out once).

-- CreateTable
CREATE TABLE "vehicle_service_contractor_payouts" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "vehicle_service_contractor_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_service_contractor_payout_items" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "vehicle_service_contractor_payout_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_service_contractor_payouts_paymentId_key" ON "vehicle_service_contractor_payouts"("paymentId");

-- CreateIndex
CREATE INDEX "vehicle_service_contractor_payouts_contractorId_idx" ON "vehicle_service_contractor_payouts"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_service_contractor_payout_items_taskId_key" ON "vehicle_service_contractor_payout_items"("taskId");

-- AddForeignKey
ALTER TABLE "vehicle_service_contractor_payouts" ADD CONSTRAINT "vehicle_service_contractor_payouts_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "vehicle_service_contractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_contractor_payouts" ADD CONSTRAINT "vehicle_service_contractor_payouts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_contractor_payouts" ADD CONSTRAINT "vehicle_service_contractor_payouts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "expense_account_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_contractor_payouts" ADD CONSTRAINT "vehicle_service_contractor_payouts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_contractor_payout_items" ADD CONSTRAINT "vehicle_service_contractor_payout_items_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "vehicle_service_contractor_payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_service_contractor_payout_items" ADD CONSTRAINT "vehicle_service_contractor_payout_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "vehicle_service_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
