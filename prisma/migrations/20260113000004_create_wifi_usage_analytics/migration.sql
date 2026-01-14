-- Migration: Create wifi_usage_analytics table
-- Created: 2026-01-13
-- Purpose: Track WiFi usage analytics and metrics across different time periods
-- Expected Impact: Enables WiFi usage analytics for ESP32 and R710 systems

-- Create wifi_usage_analytics table
CREATE TABLE "wifi_usage_analytics" (
    "id" TEXT NOT NULL,
    "periodType" VARCHAR(10) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "system" VARCHAR(10) NOT NULL,
    "businessId" TEXT,
    "uniqueDevices" INTEGER NOT NULL DEFAULT 0,
    "totalConnections" INTEGER NOT NULL DEFAULT 0,
    "avgConnectionDuration" DECIMAL(12,2),
    "tokensGenerated" INTEGER NOT NULL DEFAULT 0,
    "tokensSold" INTEGER NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "tokensExpired" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "esp32Revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "r710Revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalBandwidthDown" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalBandwidthUp" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deviceTypeStats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wifi_usage_analytics_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX "wifi_usage_analytics_periodType_periodStart_system_busines_key"
    ON "wifi_usage_analytics"("periodType", "periodStart", "system", "businessId");

-- Create indexes
CREATE INDEX "wifi_usage_analytics_periodStart_idx" ON "wifi_usage_analytics"("periodStart");
CREATE INDEX "wifi_usage_analytics_periodEnd_idx" ON "wifi_usage_analytics"("periodEnd");
CREATE INDEX "wifi_usage_analytics_system_idx" ON "wifi_usage_analytics"("system");
CREATE INDEX "wifi_usage_analytics_businessId_idx" ON "wifi_usage_analytics"("businessId");
CREATE INDEX "wifi_usage_analytics_periodType_idx" ON "wifi_usage_analytics"("periodType");

-- Add foreign key constraint
ALTER TABLE "wifi_usage_analytics" ADD CONSTRAINT "wifi_usage_analytics_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
