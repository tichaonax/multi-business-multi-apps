-- Seed default system-level chicken run categories (businessId=null so all businesses see them)
-- These appear in /business/inventory-categories under businessType='chicken_run'

DO $$
BEGIN
  -- ── Feed Types ──────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Starter' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Starter', '🐣', '#22C55E', true, false, 1, NOW(), NOW(), '{"chickenRunGroup":"feed_type"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Grower' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Grower', '🌱', '#16A34A', true, false, 2, NOW(), NOW(), '{"chickenRunGroup":"feed_type"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Finisher' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Finisher', '🏁', '#15803D', true, false, 3, NOW(), NOW(), '{"chickenRunGroup":"feed_type"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Layer' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Layer', '🥚', '#CA8A04', true, false, 4, NOW(), NOW(), '{"chickenRunGroup":"feed_type"}');
  END IF;

  -- ── Medications ─────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Antibiotics' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Antibiotics', '💊', '#DC2626', true, false, 1, NOW(), NOW(), '{"chickenRunGroup":"medication"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Vitamins & Supplements' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Vitamins & Supplements', '🧪', '#7C3AED', true, false, 2, NOW(), NOW(), '{"chickenRunGroup":"medication"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Vaccine' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Vaccine', '💉', '#2563EB', true, false, 3, NOW(), NOW(), '{"chickenRunGroup":"medication"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Antiparasitic' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Antiparasitic', '🦠', '#D97706', true, false, 4, NOW(), NOW(), '{"chickenRunGroup":"medication"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Electrolytes' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Electrolytes', '💧', '#0EA5E9', true, false, 5, NOW(), NOW(), '{"chickenRunGroup":"medication"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Antifungal' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Antifungal', '🍄', '#EA580C', true, false, 6, NOW(), NOW(), '{"chickenRunGroup":"medication"}');
  END IF;
END $$;
