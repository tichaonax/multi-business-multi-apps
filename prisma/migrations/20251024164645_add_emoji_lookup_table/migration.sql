/*
  Warnings:

  - Made the column `emoji` on table `expense_categories` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."expense_categories" ALTER COLUMN "emoji" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."emoji_lookup" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "name" TEXT,
    "url" TEXT,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "emoji_lookup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "emoji_lookup_description_idx" ON "public"."emoji_lookup"("description");

-- CreateIndex
CREATE UNIQUE INDEX "emoji_lookup_emoji_description_key" ON "public"."emoji_lookup"("emoji", "description");
