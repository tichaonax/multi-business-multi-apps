-- AlterTable
ALTER TABLE "business_token_menu_items" ADD COLUMN IF NOT EXISTS "durationMinutesOverride" INTEGER;

-- AlterTable
ALTER TABLE "business_token_menu_items" ADD COLUMN IF NOT EXISTS "bandwidthDownMbOverride" INTEGER;

-- AlterTable
ALTER TABLE "business_token_menu_items" ADD COLUMN IF NOT EXISTS "bandwidthUpMbOverride" INTEGER;
