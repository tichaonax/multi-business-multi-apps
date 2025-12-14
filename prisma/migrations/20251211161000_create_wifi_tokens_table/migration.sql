-- Migration: Create wifi_tokens table
-- Created: 2025-12-11
-- Purpose: Create table for WiFi portal tokens with proper schema
-- Expected Impact: Enables WiFi token management functionality

-- Create wifi_tokens table
CREATE TABLE "wifi_tokens" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "tokenConfigId" TEXT NOT NULL,
    "businessTokenMenuItemId" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "bandwidthUsedDown" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bandwidthUsedUp" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "wifi_tokens_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "wifi_tokens_token_key" ON "wifi_tokens"("token");
CREATE INDEX "idx_wifi_tokens_businessId" ON "wifi_tokens"("businessId");
CREATE INDEX "idx_wifi_tokens_tokenConfigId" ON "wifi_tokens"("tokenConfigId");
CREATE INDEX "idx_wifi_tokens_status" ON "wifi_tokens"("status");

-- Add foreign key constraints
ALTER TABLE "wifi_tokens" ADD CONSTRAINT "wifi_tokens_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wifi_tokens" ADD CONSTRAINT "wifi_tokens_tokenConfigId_fkey" FOREIGN KEY ("tokenConfigId") REFERENCES "token_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wifi_tokens" ADD CONSTRAINT "wifi_tokens_businessTokenMenuItemId_fkey" FOREIGN KEY ("businessTokenMenuItemId") REFERENCES "business_token_menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;