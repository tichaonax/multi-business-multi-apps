-- Same bug class as 20260325500000_ensure_education_expense_categories_exist and
-- 20260326999999_ensure_hardware_categories_exist, one layer up: migration
-- 20251031200000_seed_default_business_categories inserts a business_categories
-- row with domainId 'domain_service_consultation' and another with
-- 'domain_service_maintenance', but no migration ever creates those two
-- inventory_domains rows. On a fresh install, if a 'service' type business exists
-- by the time that migration's guarded block runs, this fails with a foreign key
-- violation on business_categories_domainId_fkey.
--
-- Column values follow the convention used by sibling rows in
-- 20251028062000_seed_inventory_domains (businessType 'service', isSystemTemplate
-- true, isActive true).
--
-- Idempotent (ON CONFLICT DO NOTHING) — safe to run on a database that already
-- has these rows.

INSERT INTO "public"."inventory_domains" ("id", "name", "emoji", "description", "businessType", "isActive", "isSystemTemplate", "createdAt")
VALUES
  ('domain_service_consultation', 'Consultation', '💼', 'Professional consulting and advisory services', 'service', true, true, NOW()),
  ('domain_service_maintenance',  'Maintenance',  '🔧', 'Repair and maintenance services',               'service', true, true, NOW())
ON CONFLICT (id) DO NOTHING;
