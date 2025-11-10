-- AddFormatColumnToIdFormatTemplates
-- This migration adds the 'format' column to the id_format_templates table
-- The column stores user-friendly display formats (e.g., "##-######A##") for UI purposes
-- The 'pattern' column continues to store regex validation patterns

-- Add format column (nullable to support existing records)
ALTER TABLE "id_format_templates"
ADD COLUMN IF NOT EXISTS "format" TEXT;

-- Add comment explaining the column purpose
COMMENT ON COLUMN "id_format_templates"."format" IS 'User-friendly display format for UI (e.g., ##-######A##)';
COMMENT ON COLUMN "id_format_templates"."pattern" IS 'Regex validation pattern for input validation';
