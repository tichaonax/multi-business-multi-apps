-- Add missing device tracking columns to wifi_tokens table
-- These columns were missing from the original migration but are defined in the Prisma schema

ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "deviceCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "deviceType" VARCHAR(100);
ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "firstSeen" TIMESTAMP(3);
ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "hostname" VARCHAR(255);
ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "lastSeen" TIMESTAMP(3);
ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "primaryMac" VARCHAR(17);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS "idx_wifi_tokens_primaryMac" ON "wifi_tokens"("primaryMac");
CREATE INDEX IF NOT EXISTS "idx_wifi_tokens_hostname" ON "wifi_tokens"("hostname");
CREATE INDEX IF NOT EXISTS "idx_wifi_tokens_lastSeen" ON "wifi_tokens"("lastSeen");