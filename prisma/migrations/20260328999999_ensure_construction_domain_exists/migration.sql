-- Same bug class as 20260325500000_ensure_education_expense_categories_exist,
-- 20260326999999_ensure_hardware_categories_exist and
-- 20251031199999_ensure_service_domains_exist, but a subtler variant: migration
-- 20260413000002_seed_construction_expense_categories hardcodes the literal
-- domainId 'domain-construction' on 23 expense_categories inserts, but no
-- migration ever creates an expense_domains row with that literal id — it
-- only ever existed on the original author's dev database (out-of-band, same
-- as the other cases).
--
-- This one is trickier than a plain "row missing" case: expense_domains.name
-- is globally UNIQUE, and 20260329000004_seed_existing_business_domains
-- unconditionally creates a 'Construction' domain (with a fresh
-- gen_random_uuid() id) via `ON CONFLICT (name) DO UPDATE`. On a genuinely
-- fresh `prisma migrate deploy` run (all migrations applied in order from
-- scratch), this migration sorts before that one, so it wins the 'Construction'
-- name first with the literal id everything downstream expects, and
-- 20260329000004's upsert-by-name then just updates its emoji in place.
--
-- But if a database already progressed past 20260329000004 before this fix
-- existed (e.g. an in-progress install that was fixing these bugs one at a
-- time rather than resetting), a 'Construction' domain already exists under a
-- random UUID, and simply inserting a second row would violate the name
-- unique constraint while leaving the wrong id in place. Handle that case too
-- by renaming the existing row's id in-place — safe because
-- expense_categories_domainId_fkey is declared ON UPDATE CASCADE (see
-- 20251021122836_add_expense_category_system), so any categories already
-- seeded under the old id (e.g. by 20260330000001_upsert_construction_domain)
-- automatically follow the rename.
--
-- Idempotent — safe to run on a database in any of these three states.

DO $$
DECLARE
  existing_id TEXT;
BEGIN
  SELECT id INTO existing_id FROM expense_domains WHERE name = 'Construction';

  IF existing_id IS NULL THEN
    INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
    VALUES ('domain-construction', 'Construction', '🏗️', 'Construction and building trade expenses', true, NOW());
  ELSIF existing_id <> 'domain-construction' THEN
    UPDATE expense_domains SET id = 'domain-construction' WHERE id = existing_id;
  END IF;
END $$;
