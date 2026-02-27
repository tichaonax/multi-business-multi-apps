-- AlterTable: add optional cost_price column to clothing_bales
-- costPrice: the total amount paid to acquire the bale (used for cost-recovery reporting)
ALTER TABLE "clothing_bales" ADD COLUMN "costPrice" DECIMAL(10,2);
