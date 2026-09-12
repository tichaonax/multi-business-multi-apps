-- Fixes a fresh-install-breaking bug in migration 20260327000012_hardware_subcategories,
-- which inserts inventory_subcategories rows referencing 'cat_hardware_hand_tools_001',
-- 'cat_hardware_power_tools_001' and 'cat_hardware_plumbing_001' without ever creating
-- those business_categories rows itself. On any database where they'd already been
-- created out-of-band (via the standalone scripts/seed-type-categories.js, which is
-- never run automatically by `prisma migrate deploy`), that migration applied fine —
-- but on a genuinely fresh install it fails with a foreign key violation on
-- inventory_subcategories_categoryId_fkey, blocking every new install.
--
-- Same bug class as 20260325500000_ensure_education_expense_categories_exist, different
-- table pair (business_categories / inventory_subcategories instead of
-- expense_categories / expense_subcategories) — this is a recurring pattern across the
-- migration history, not isolated to one table.
--
-- Column values mirror the `create` block for these three ids in
-- scripts/seed-type-categories.js exactly (including its 'domain_hardware_hand_tools'
-- domainId for Plumbing, which looks like a pre-existing copy/paste bug in that script,
-- but is left as-is here to match what would actually have been created rather than
-- guessing at a "correct" domain). domain_hardware_hand_tools and
-- domain_hardware_power_tools already exist from 20251028062000_seed_inventory_domains,
-- which runs long before this.
--
-- Idempotent (ON CONFLICT DO NOTHING) — safe to run on a database that already has
-- these rows from a prior manual run of seed-type-categories.js.

INSERT INTO business_categories (id, name, description, emoji, color, "businessType", "domainId", "businessId", "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt")
VALUES
  ('cat_hardware_hand_tools_001',  'Hand Tools',   'Manual tools and equipment',            '🔨', '#EF4444', 'hardware', 'domain_hardware_hand_tools',  NULL, true, false, 1, NOW(), NOW()),
  ('cat_hardware_power_tools_001', 'Power Tools',  'Electric and battery-powered tools',     '⚡', '#F59E0B', 'hardware', 'domain_hardware_power_tools', NULL, true, false, 2, NOW(), NOW()),
  ('cat_hardware_plumbing_001',    'Plumbing',     'Pipes, fittings, and plumbing supplies', '🚰', '#06B6D4', 'hardware', 'domain_hardware_hand_tools',  NULL, true, false, 4, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
