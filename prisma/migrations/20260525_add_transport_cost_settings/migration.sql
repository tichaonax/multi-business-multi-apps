-- Migration: Add transport cost settings to businesses
-- MBM-221: Inventory Cost Price Enforcement & Pricing Calculator

ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "transportCostEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "transportDistanceKm"  DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS "transportCostPerKm"   DECIMAL(6,3) NOT NULL DEFAULT 0.30;
