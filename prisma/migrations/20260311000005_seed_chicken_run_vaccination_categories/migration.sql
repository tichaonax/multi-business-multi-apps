-- Seed default vaccination categories for chicken run (businessId=null = system-wide)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Newcastle Disease' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Newcastle Disease', '💉', '#EF4444', true, false, 1, NOW(), NOW(), '{"chickenRunGroup":"vaccination"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Infectious Bronchitis' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Infectious Bronchitis', '💉', '#F97316', true, false, 2, NOW(), NOW(), '{"chickenRunGroup":"vaccination"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Gumboro (IBD)' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Gumboro (IBD)', '💉', '#A855F7', true, false, 3, NOW(), NOW(), '{"chickenRunGroup":"vaccination"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Marek''s Disease' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Marek''s Disease', '💉', '#3B82F6', true, false, 4, NOW(), NOW(), '{"chickenRunGroup":"vaccination"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Fowl Pox' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Fowl Pox', '💉', '#84CC16', true, false, 5, NOW(), NOW(), '{"chickenRunGroup":"vaccination"}');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM business_categories WHERE "businessType" = 'chicken_run' AND name = 'Avian Influenza' AND "businessId" IS NULL) THEN
    INSERT INTO business_categories (id, "businessType", name, emoji, color, "isActive", "isUserCreated", "displayOrder", "createdAt", "updatedAt", attributes)
    VALUES (gen_random_uuid(), 'chicken_run', 'Avian Influenza', '💉', '#06B6D4', true, false, 6, NOW(), NOW(), '{"chickenRunGroup":"vaccination"}');
  END IF;
END $$;
