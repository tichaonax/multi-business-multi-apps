-- Migration: Create wifi_token_devices table
-- Created: 2026-01-13
-- Purpose: Track devices connected using WiFi tokens
-- Expected Impact: Enables device tracking for WiFi portal tokens

-- Create wifi_token_devices table
CREATE TABLE "wifi_token_devices" (
    "id" TEXT NOT NULL,
    "wifiTokenId" TEXT NOT NULL,
    "macAddress" VARCHAR(17) NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "currentIp" VARCHAR(15),
    "firstSeen" TIMESTAMP(3) NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wifi_token_devices_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX "wifi_token_devices_wifiTokenId_macAddress_key" ON "wifi_token_devices"("wifiTokenId", "macAddress");

-- Create indexes
CREATE INDEX "wifi_token_devices_wifiTokenId_idx" ON "wifi_token_devices"("wifiTokenId");
CREATE INDEX "wifi_token_devices_macAddress_idx" ON "wifi_token_devices"("macAddress");
CREATE INDEX "wifi_token_devices_isOnline_idx" ON "wifi_token_devices"("isOnline");

-- Add foreign key constraint
ALTER TABLE "wifi_token_devices" ADD CONSTRAINT "wifi_token_devices_wifiTokenId_fkey"
    FOREIGN KEY ("wifiTokenId") REFERENCES "wifi_tokens"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
