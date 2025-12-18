-- Migration: Add device tracking columns to wifi_tokens
-- Created: 2025-12-15
-- Purpose: Add device tracking fields for ESP32 integration
-- Expected Impact: Enables device tracking and management for WiFi tokens

-- Add device tracking columns
ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "deviceCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "deviceType" VARCHAR(100);
ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "firstSeen" TIMESTAMP(3);
ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "hostname" VARCHAR(255);
ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "lastSeen" TIMESTAMP(3);
ALTER TABLE "wifi_tokens" ADD COLUMN IF NOT EXISTS "primaryMac" VARCHAR(17);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "wifi_tokens_primaryMac_idx" ON "wifi_tokens"("primaryMac");
CREATE INDEX IF NOT EXISTS "wifi_tokens_hostname_idx" ON "wifi_tokens"("hostname");
CREATE INDEX IF NOT EXISTS "wifi_tokens_lastSeen_idx" ON "wifi_tokens"("lastSeen");
