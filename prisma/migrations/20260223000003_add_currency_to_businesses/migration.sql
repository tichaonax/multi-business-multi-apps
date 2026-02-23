-- Add currency and currencySymbol fields to businesses table
-- Default to USD / $ which matches existing hardcoded behavior

ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "currencySymbol" TEXT NOT NULL DEFAULT '$';
