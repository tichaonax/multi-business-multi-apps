-- Seed barcode management permissions
-- These granular permissions replaced the legacy BARCODE_MANAGEMENT permission

INSERT INTO "permissions" ("id", "name", "description", "category", "isSystemPermission", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'BARCODE_MANAGE_TEMPLATES', 'Create, edit, and delete barcode templates', 'Barcode Management', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'BARCODE_VIEW_TEMPLATES',   'View barcode templates and history',           'Barcode Management', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'BARCODE_PRINT',            'Submit print jobs and view print queue',       'Barcode Management', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'BARCODE_VIEW_REPORTS',     'Access print history and analytics',           'Barcode Management', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'BARCODE_MANAGE_SETTINGS',  'Configure printers and print settings',        'Barcode Management', true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
