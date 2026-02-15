-- AlterTable
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "taxEnabled" BOOLEAN NOT NULL DEFAULT false;
