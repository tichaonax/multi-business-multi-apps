-- Insert 10 new fine-grained permissions for AYLI, Customer Display, and POS Settings
INSERT INTO "permissions" ("id", "name", "description", "category", "isSystemPermission", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'canCreateAYLIPoolItems',   'Create new AYLI pool items',                              'AYLI',    false, NOW(), NOW()),
  (gen_random_uuid(), 'canDeleteAYLIPoolItems',   'Delete AYLI pool items',                                  'AYLI',    false, NOW(), NOW()),
  (gen_random_uuid(), 'canDisableAYLIPoolItems',  'Activate or deactivate AYLI pool items',                  'AYLI',    false, NOW(), NOW()),
  (gen_random_uuid(), 'canCreateAYLICombos',      'Create new AYLI combo definitions',                       'AYLI',    false, NOW(), NOW()),
  (gen_random_uuid(), 'canDeleteAYLICombos',      'Delete AYLI combo definitions',                           'AYLI',    false, NOW(), NOW()),
  (gen_random_uuid(), 'canDisableAYLICombos',     'Activate or deactivate AYLI combos',                      'AYLI',    false, NOW(), NOW()),
  (gen_random_uuid(), 'canViewCustomerDisplay',   'View customer display page (read-only)',                   'Display', false, NOW(), NOW()),
  (gen_random_uuid(), 'canManageCustomerDisplay', 'Edit customer display settings and product configs',       'Display', false, NOW(), NOW()),
  (gen_random_uuid(), 'canAccessScaleSettings',   'Access Scale & Weighing tab in POS settings',             'POS',     false, NOW(), NOW()),
  (gen_random_uuid(), 'canAccessVendorPricing',   'Access vendor buying/selling price presets in POS',       'POS',     false, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
