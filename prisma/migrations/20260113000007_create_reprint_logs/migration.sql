-- Migration: Create reprint_logs table
-- Created: 2026-01-13
-- Purpose: Add reprint_logs table for tracking receipt reprints
-- Expected Impact: Allows backup system to query reprint_logs

-- Create reprint_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS "reprint_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "reprintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "reprint_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "reprint_logs_orderId_idx" ON "reprint_logs"("orderId");
CREATE INDEX IF NOT EXISTS "reprint_logs_businessId_reprintedAt_idx" ON "reprint_logs"("businessId", "reprintedAt");
CREATE INDEX IF NOT EXISTS "reprint_logs_userId_idx" ON "reprint_logs"("userId");

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reprint_logs_businessId_fkey') THEN
        ALTER TABLE "reprint_logs" ADD CONSTRAINT "reprint_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reprint_logs_orderId_fkey') THEN
        ALTER TABLE "reprint_logs" ADD CONSTRAINT "reprint_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "business_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reprint_logs_userId_fkey') THEN
        ALTER TABLE "reprint_logs" ADD CONSTRAINT "reprint_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END$$;
