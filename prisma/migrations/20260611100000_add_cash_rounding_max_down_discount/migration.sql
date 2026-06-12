-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "cash_rounding_max_down_discount" DECIMAL(10,2) NOT NULL DEFAULT 0.10;
