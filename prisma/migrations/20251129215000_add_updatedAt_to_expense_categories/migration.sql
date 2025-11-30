-- Migration: Add updatedAt column to expense_categories for seed compatibility
-- Created: 2025-11-29 21:50:00

ALTER TABLE "expense_categories"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "idx_expense_categories_updated_at" ON "expense_categories"("updatedAt" DESC);
