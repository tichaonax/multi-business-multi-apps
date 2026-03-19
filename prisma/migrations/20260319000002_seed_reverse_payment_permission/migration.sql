-- MBM-153: Seed named permission for reversing payments to petty cash
-- Adds the permission record so it can be granted to users via UserPermissions

INSERT INTO "permissions" ("id", "name", "description", "category", "isSystemPermission", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'payment.reverse_to_petty_cash',
  'Reverse incorrectly submitted expense payments and convert them to a petty cash request',
  'payments',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;
