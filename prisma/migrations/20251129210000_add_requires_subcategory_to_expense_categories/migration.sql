-- Migration: Add requiresSubcategory column to expense_categories
-- Created: 2025-11-29
-- This migration adds the missing column required by the Prisma schema and seed scripts.

ALTER TABLE "expense_categories" ADD COLUMN "requiresSubcategory" BOOLEAN NOT NULL DEFAULT false;
