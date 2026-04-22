-- Add payment collection and return tracking fields to delivery_order_meta
ALTER TABLE "delivery_order_meta"
  ADD COLUMN IF NOT EXISTS "paymentCollected"   DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "paymentCollectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "returnReason"       TEXT;
