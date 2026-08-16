-- AlterTable
ALTER TABLE "business_orders" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidBy" TEXT;

-- AddForeignKey
ALTER TABLE "business_orders" ADD CONSTRAINT "business_orders_paidBy_fkey" FOREIGN KEY ("paidBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
