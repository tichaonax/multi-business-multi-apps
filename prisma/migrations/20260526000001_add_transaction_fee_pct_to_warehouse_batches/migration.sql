-- Add transaction fee percentage to warehouse batches
ALTER TABLE "warehouse_batches" ADD COLUMN "transactionFeePct" DECIMAL(5, 2);
