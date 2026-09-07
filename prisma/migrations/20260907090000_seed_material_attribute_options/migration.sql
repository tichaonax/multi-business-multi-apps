-- Seed shared clothing material presets (companion to the sizes/colors seed
-- in 20260907080000) — no schema change needed, attribute_options.attributeKey
-- is already a free-form string; this just adds a new 'materials' vocabulary.
-- businessId is left NULL so these act as shared defaults for every clothing
-- business, matching Tags' own global/business-owned split.
INSERT INTO "attribute_options" ("id", "businessType", "attributeKey", "value")
VALUES
  (gen_random_uuid()::text, 'clothing', 'materials', 'Cotton'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Polyester'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Wool'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Silk'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Linen'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Denim'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Leather'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Suede'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Nylon'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Spandex'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Rayon'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Viscose'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Cashmere'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Fleece'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Canvas'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Velvet'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Corduroy'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Polycotton'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Lace'),
  (gen_random_uuid()::text, 'clothing', 'materials', 'Satin')
ON CONFLICT ("businessType", "attributeKey", "value") DO NOTHING;
