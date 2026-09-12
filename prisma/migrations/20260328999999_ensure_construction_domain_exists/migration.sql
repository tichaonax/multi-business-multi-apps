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
-- gen_random_uuid() id) via `ON CONFLICT (name) DO UPDATE`. On a fresh
-- install, that runs first and claims the 'Construction' name with a random
-- id, so 20260413000002's hardcoded 'domain-construction' id never exists,
-- and it fails with a foreign key violation on expense_categories_domainId_fkey.
--
-- On the original dev database, this migration's job was effectively already
-- done — a 'domain-construction' row already existed there — so
-- 20260329000004's `ON CONFLICT (name) DO UPDATE` matched it by name and
-- preserved its existing id rather than creating a new one. Replicating that
-- exact row here (sorting immediately before 20260329000004) makes fresh
-- installs behave identically: this migration creates the 'Construction'
-- domain first, with the literal id everything downstream expects, and
-- 20260329000004's upsert-by-name then just updates its emoji in place.
--
-- Idempotent (ON CONFLICT DO NOTHING) — safe to run on a database that
-- already has a 'Construction' domain under any id.

INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
SELECT 'domain-construction', 'Construction', '🏗️', 'Construction and building trade expenses', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM expense_domains WHERE name = 'Construction');
