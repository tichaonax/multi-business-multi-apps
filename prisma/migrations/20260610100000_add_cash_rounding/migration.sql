-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "cash_rounding_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "businesses" ADD COLUMN "cash_rounding_step" DECIMAL(10,2) NOT NULL DEFAULT 0.50;
ALTER TABLE "businesses" ADD COLUMN "cash_rounding_up_threshold" DECIMAL(10,2) NOT NULL DEFAULT 0.05;

-- CreateTable
CREATE TABLE "cash_rounding_logs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "order_id" TEXT,
    "direction" TEXT NOT NULL,
    "original_amount" DECIMAL(10,2) NOT NULL,
    "rounded_amount" DECIMAL(10,2) NOT NULL,
    "adjustment" DECIMAL(10,2) NOT NULL,
    "staff_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_rounding_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cash_rounding_logs" ADD CONSTRAINT "cash_rounding_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
