-- Add serviceType and emoji fields to persons table
ALTER TABLE "public"."persons" ADD COLUMN IF NOT EXISTS "serviceType" TEXT;
ALTER TABLE "public"."persons" ADD COLUMN IF NOT EXISTS "emoji" TEXT;
