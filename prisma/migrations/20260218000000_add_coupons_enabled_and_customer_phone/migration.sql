-- Add couponsEnabled toggle to businesses
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "couponsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Add customerPhone to coupon_usages for per-customer tracking
ALTER TABLE "coupon_usages" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;

-- Add unique constraint: one coupon per customer phone
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_usages_couponId_customerPhone_key"
  ON "coupon_usages" ("couponId", "customerPhone");
