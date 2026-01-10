-- Add ecocashEnabled column to businesses table
ALTER TABLE "businesses" ADD COLUMN "ecocashEnabled" BOOLEAN NOT NULL DEFAULT false;
