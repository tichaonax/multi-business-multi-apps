-- Fixes a fresh-install-breaking bug in migration 20260326000001_education_subcategories,
-- which inserts expense_subcategories rows under 'category-education' and
-- 'cat-personal-education' without ever creating those two parent
-- expense_categories rows itself. On any database where they'd already been
-- created out-of-band (the original author's dev database), that migration
-- applied fine — but on a genuinely fresh `prisma migrate deploy`, it fails
-- with a foreign key violation on expense_subcategories_categoryId_fkey,
-- blocking every new install.
--
-- Neither id is created by ANY other migration or seed script in this repo
-- (confirmed by search) — there is no discoverable "correct" domain
-- assignment for 'category-education' to restore, so it's created here as a
-- domain-less category (domainId is nullable by design for exactly this
-- kind of case) rather than guessing. 'cat-personal-education' follows the
-- existing 'cat-personal-*' naming/domain convention seen throughout
-- 20260225000002_expand_general_personal_expense_categories (domain-personal,
-- color #8B5CF6, requiresSubcategory false).
--
-- Idempotent (ON CONFLICT DO NOTHING) — safe to run on a database that
-- already has these rows from before this fix existed.

-- Ensure the Personal domain exists (same defensive pattern already used by
-- 20260225000002_expand_general_personal_expense_categories).
INSERT INTO expense_domains (id, name, emoji, description, "isActive", "createdAt")
SELECT 'domain-personal', 'Personal', '👤', 'Personal expense categories', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM expense_domains WHERE id = 'domain-personal');

INSERT INTO expense_categories (id, name, emoji, color, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('category-education', 'Education', '🎓', '#8B5CF6', true, false, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_categories (id, "domainId", name, emoji, color, "isDefault", "isUserCreated", "requiresSubcategory", "createdAt", "updatedAt")
VALUES ('cat-personal-education', 'domain-personal', 'Education', '🎓', '#8B5CF6', true, false, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
