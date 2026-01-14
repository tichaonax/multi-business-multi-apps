-- Migration: Add saleChannel column to wifi_token_sales
-- Created: 2026-01-13
-- Purpose: Add missing saleChannel column with default value and index
-- Expected Impact: Enables tracking of sale channel (DIRECT, POS, etc.)

-- Add saleChannel column with default value
ALTER TABLE "wifi_token_sales" ADD COLUMN "saleChannel" TEXT NOT NULL DEFAULT 'DIRECT';

-- Create index on saleChannel
CREATE INDEX "wifi_token_sales_saleChannel_idx" ON "wifi_token_sales"("saleChannel");
