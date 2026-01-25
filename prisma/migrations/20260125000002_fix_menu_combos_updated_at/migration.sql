-- Fix menu_combos updatedAt column to have default value
ALTER TABLE "menu_combos" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
