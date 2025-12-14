-- Migration: Add wifiIntegrationEnabled column to businesses table
-- Created: 2025-12-11
-- Purpose: Add WiFi portal integration flag to businesses
-- Expected Impact: Allows businesses to enable/disable WiFi portal integration

-- Add wifiIntegrationEnabled column to businesses table
ALTER TABLE "businesses" ADD COLUMN "wifiIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false;