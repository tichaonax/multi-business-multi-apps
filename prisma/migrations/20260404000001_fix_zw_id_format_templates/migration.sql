-- Fix Zimbabwe ID format templates
-- Uses upsert (INSERT ... ON CONFLICT DO UPDATE) so this is safe to run on both
-- fresh databases (where the row may never have been seeded) and existing ones.

-- ── Zimbabwe National ID ─────────────────────────────────────────────────────
-- Accepts both 6-digit (63-123456A78) and 7-digit (27-2015556G27) variants.
-- Letter is case-insensitive in the regex so lower/upper both validate.
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

-- ── Zimbabwe Driver Licence ──────────────────────────────────────────────────
-- Format: 3–8 digits followed by 1–3 letters (e.g. 82382DK)
INSERT INTO "id_format_templates"
  ("id", "name", "description", "pattern", "example", "countryCode", "isActive", "templateType", "createdAt", "updatedAt")
VALUES
  (
    'zw-driver-licence',
    'Zimbabwe Driver Licence',
    'Zimbabwe driver''s licence: digits followed by letters (e.g. 82382DK)',
    '^\d{3,8}[A-Za-z]{1,3}$',
    '82382DK',
    'ZW',
    true,
    'national_id',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO UPDATE SET
  "pattern"      = '^\d{3,8}[A-Za-z]{1,3}$',
  "example"      = '82382DK',
  "description"  = 'Zimbabwe driver''s licence: digits followed by letters (e.g. 82382DK)',
  "templateType" = 'national_id',
  "isActive"     = true,
  "updatedAt"    = CURRENT_TIMESTAMP;
