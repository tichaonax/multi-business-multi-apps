-- Add templateType column to distinguish national_id, phone, and date templates
ALTER TABLE "id_format_templates" ADD COLUMN "templateType" TEXT NOT NULL DEFAULT 'national_id';

-- Mark phone templates
UPDATE "id_format_templates" SET "templateType" = 'phone'
WHERE id IN ('bw-phone', 'ke-phone', 'za-phone', 'uk-phone', 'us-phone', 'zm-phone', 'zw-phone');

-- Mark date templates
UPDATE "id_format_templates" SET "templateType" = 'date'
WHERE id IN ('dd-mm-yyyy', 'dd-mm-yyyy-dash', 'dd-dot-mm-dot-yyyy', 'mm-dd-yyyy', 'yyyy-mm-dd');

-- Fix Zimbabwe National ID: accept both 6-digit (63-123456A78) and 7-digit (27-2015556G27) formats
UPDATE "id_format_templates"
SET
  pattern = '^\d{2}-\d{6,7}[A-Z]\d{2}$',
  example = '27-2015556G27',
  format  = '##-#######?##'
WHERE id = 'zw-national-id';
