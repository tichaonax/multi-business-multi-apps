-- Migration: Add missing column to r710_wlans
-- Created: 2026-01-13
-- Purpose: Add enableZeroIt column (enableFriendlyKey was added in 20251226000000_add_enable_friendly_key)
-- Expected Impact: Completes r710_wlans table structure

-- Add missing column (enableFriendlyKey already exists from earlier migration)
ALTER TABLE "r710_wlans" ADD COLUMN "enableZeroIt" BOOLEAN NOT NULL DEFAULT true;
