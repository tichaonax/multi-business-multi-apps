-- AlterTable: add promosEnabled to businesses
ALTER TABLE "businesses" ADD COLUMN "promosEnabled" BOOLEAN NOT NULL DEFAULT false;
