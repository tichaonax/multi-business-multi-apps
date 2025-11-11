-- AlterTable: Add missing fields to initial_load_sessions table
-- Add fields for tracking transfer progress and metadata

ALTER TABLE "initial_load_sessions"
ADD COLUMN IF NOT EXISTS "transferredRecords" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "transferredBytes" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "currentStep" TEXT,
ADD COLUMN IF NOT EXISTS "estimatedTimeRemaining" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Set default value for tableName
ALTER TABLE "initial_load_sessions"
ALTER COLUMN "tableName" SET DEFAULT 'businesses';

-- Note: productsSupplied column in business_suppliers (if needed)
-- This handles drift from previous db push operations
ALTER TABLE "business_suppliers"
ADD COLUMN IF NOT EXISTS "productsSupplied" TEXT;
