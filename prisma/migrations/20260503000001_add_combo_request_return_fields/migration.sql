-- AlterTable
ALTER TABLE "combo_payment_requests" ADD COLUMN "returnNote" TEXT,
ADD COLUMN "returnedAt" TIMESTAMP(3),
ADD COLUMN "returnedBy" TEXT;

-- AddForeignKey
ALTER TABLE "combo_payment_requests" ADD CONSTRAINT "combo_payment_requests_returnedBy_fkey" FOREIGN KEY ("returnedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
