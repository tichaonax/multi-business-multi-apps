-- Assign curated emojis to construction inventory categories that were
-- still on the default 📦. Matches by (businessType, name) so it applies
-- to every domain/parent grouping that name appears under. Idempotent —
-- safe to re-run (sets the same value again if already applied).

UPDATE business_categories SET emoji = '📦', "updatedAt" = NOW() WHERE "businessType" = 'construction' AND name = 'Procurement';
UPDATE business_categories SET emoji = '🧰', "updatedAt" = NOW() WHERE "businessType" = 'construction' AND name = 'Tooling';
