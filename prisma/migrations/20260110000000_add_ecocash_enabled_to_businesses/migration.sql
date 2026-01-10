-- Add ecocashEnabled column to businesses table
ALTER TABLE "businesses" ADD COLUMN "ecocash_enabled" BOOLEAN NOT NULL DEFAULT false;
