-- Add serviceType and emoji fields to persons table
ALTER TABLE "public"."persons" ADD COLUMN "serviceType" TEXT;
ALTER TABLE "public"."persons" ADD COLUMN "emoji" TEXT;
