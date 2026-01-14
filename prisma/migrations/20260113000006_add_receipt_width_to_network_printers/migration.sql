-- Migration: Add receiptWidth column to network_printers
-- Created: 2026-01-13
-- Purpose: Add receiptWidth column for receipt printer configuration
-- Expected Impact: Allows backup system to query network_printers.receiptWidth

-- Add receiptWidth column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'network_printers'
        AND column_name = 'receiptWidth'
    ) THEN
        ALTER TABLE "network_printers" ADD COLUMN "receiptWidth" INTEGER DEFAULT 48;
    END IF;
END $$;
