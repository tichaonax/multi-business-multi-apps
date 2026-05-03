-- MBM-201: Combo Request Settle Remaining Balance Workflow

-- AlterEnum: add SETTLE_REQUESTED and SETTLED values
ALTER TYPE "ComboPaymentRequestStatus" ADD VALUE IF NOT EXISTS 'SETTLE_REQUESTED';
ALTER TYPE "ComboPaymentRequestStatus" ADD VALUE IF NOT EXISTS 'SETTLED';

-- AlterTable: add settle tracking columns
ALTER TABLE "combo_payment_requests"
ADD COLUMN "settle_requested_at" TIMESTAMP(3),
ADD COLUMN "settle_confirmed_at" TIMESTAMP(3),
ADD COLUMN "settled_by" TEXT,
ADD COLUMN "settle_note" TEXT;

-- AddForeignKey
ALTER TABLE "combo_payment_requests" ADD CONSTRAINT "combo_payment_requests_settled_by_fkey" FOREIGN KEY ("settled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
