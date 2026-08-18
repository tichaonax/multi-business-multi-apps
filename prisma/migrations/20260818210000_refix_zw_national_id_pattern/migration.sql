-- Re-fix Zimbabwe National ID pattern.
--
-- The correction from 20260404000001_fix_zw_id_format_templates (accepts both
-- 6-digit and 7-digit variants: 63-123456A78 / 27-2015556G27) was silently
-- reverted at some point by a stale seed/setup script that still hard-coded
-- the old 6-digit-only pattern (scripts/fix-id-patterns.js,
-- scripts/production-setup.js, scripts/seed-migration-data.js — fixed
-- alongside this migration so it can't happen again). Re-asserting here via
-- the same idempotent upsert so this migration is safe to run on any
-- database regardless of which version is currently live.
INSERT INTO "id_format_templates"
  ("id", "name", "description", "pattern", "example", "countryCode", "isActive", "templateType", "createdAt", "updatedAt")
VALUES
  (
    'zw-national-id',
    'Zimbabwe National ID',
    'Zimbabwe national ID: 2 digits, dash, 6–7 digits, 1 letter, 2 digits (e.g. 27-2015556G27)',
    '^\d{2}-\d{6,7}[A-Za-z]\d{2}$',
    '27-2015556G27',
    'ZW',
    true,
    'national_id',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO UPDATE SET
  "pattern"      = '^\d{2}-\d{6,7}[A-Za-z]\d{2}$',
  "example"      = '27-2015556G27',
  "description"  = 'Zimbabwe national ID: 2 digits, dash, 6–7 digits, 1 letter, 2 digits (e.g. 27-2015556G27)',
  "templateType" = 'national_id',
  "isActive"     = true,
  "updatedAt"    = CURRENT_TIMESTAMP;
