-- Seed missing system permission: cash_allocation.approve
-- Was referenced in code but never inserted into the permissions table

INSERT INTO "permissions" ("id", "name", "description", "category", "isSystemPermission", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'cash_allocation.approve', 'Approve and reconcile the daily cash allocation report', 'cash_allocation', true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
