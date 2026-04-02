-- Corrective seed: Replace incorrect ZIMRA 2025 bracket values with correct ones from ZIMRA PDF.
-- The original seed (000002) had wrong bounds and deductAmounts. This migration wipes 2025 brackets
-- and re-inserts all 30 rows with the verified values.

DELETE FROM "paye_tax_brackets" WHERE "year" = 2025;

-- ============================================================
-- DAILY brackets (6 rows)
-- Example: $9/day → $9.00 × 20% − $0.66 = $1.14 ✓
-- ============================================================
INSERT INTO "paye_tax_brackets" ("id","year","tableType","lowerBound","upperBound","rate","deductAmount","sortOrder","updatedAt") VALUES
  (gen_random_uuid(), 2025, 'DAILY',   0.00,   3.29, 0.0000,  0.00, 1, NOW()),
  (gen_random_uuid(), 2025, 'DAILY',   3.30,   9.86, 0.2000,  0.66, 2, NOW()),
  (gen_random_uuid(), 2025, 'DAILY',   9.87,  32.88, 0.2500,  1.15, 3, NOW()),
  (gen_random_uuid(), 2025, 'DAILY',  32.89,  65.75, 0.3000,  2.79, 4, NOW()),
  (gen_random_uuid(), 2025, 'DAILY',  65.76,  98.63, 0.3500,  6.08, 5, NOW()),
  (gen_random_uuid(), 2025, 'DAILY',  98.64,   NULL, 0.4000, 11.01, 6, NOW());

-- ============================================================
-- WEEKLY brackets (6 rows)
-- Example: $65/week → $65.00 × 20% − $4.62 = $8.38 ✓
-- ============================================================
INSERT INTO "paye_tax_brackets" ("id","year","tableType","lowerBound","upperBound","rate","deductAmount","sortOrder","updatedAt") VALUES
  (gen_random_uuid(), 2025, 'WEEKLY',   0.00,  23.08, 0.0000,  0.00, 1, NOW()),
  (gen_random_uuid(), 2025, 'WEEKLY',  23.09,  69.23, 0.2000,  4.62, 2, NOW()),
  (gen_random_uuid(), 2025, 'WEEKLY',  69.24, 230.77, 0.2500,  8.08, 3, NOW()),
  (gen_random_uuid(), 2025, 'WEEKLY', 230.78, 461.54, 0.3000, 19.62, 4, NOW()),
  (gen_random_uuid(), 2025, 'WEEKLY', 461.55, 692.31, 0.3500, 42.69, 5, NOW()),
  (gen_random_uuid(), 2025, 'WEEKLY', 692.32,   NULL, 0.4000, 77.31, 6, NOW());

-- ============================================================
-- FORTNIGHTLY brackets (6 rows)
-- Example: $420/fortnight → $420.00 × 25% − $16.15 = $88.85 ✓
-- ============================================================
INSERT INTO "paye_tax_brackets" ("id","year","tableType","lowerBound","upperBound","rate","deductAmount","sortOrder","updatedAt") VALUES
  (gen_random_uuid(), 2025, 'FORTNIGHTLY',   0.00,   46.15, 0.0000,   0.00, 1, NOW()),
  (gen_random_uuid(), 2025, 'FORTNIGHTLY',  46.16,  138.46, 0.2000,   9.23, 2, NOW()),
  (gen_random_uuid(), 2025, 'FORTNIGHTLY', 138.47,  461.54, 0.2500,  16.15, 3, NOW()),
  (gen_random_uuid(), 2025, 'FORTNIGHTLY', 461.55,  923.08, 0.3000,  39.23, 4, NOW()),
  (gen_random_uuid(), 2025, 'FORTNIGHTLY', 923.09, 1384.62, 0.3500,  85.38, 5, NOW()),
  (gen_random_uuid(), 2025, 'FORTNIGHTLY',1384.63,    NULL, 0.4000, 154.62, 6, NOW());

-- ============================================================
-- MONTHLY brackets (6 rows)
-- Example: $1,800/month → $1,800 × 30% − $85.00 = $455.00 ✓
-- ============================================================
INSERT INTO "paye_tax_brackets" ("id","year","tableType","lowerBound","upperBound","rate","deductAmount","sortOrder","updatedAt") VALUES
  (gen_random_uuid(), 2025, 'MONTHLY',    0.00,   100.00, 0.0000,   0.00, 1, NOW()),
  (gen_random_uuid(), 2025, 'MONTHLY',  100.01,   300.00, 0.2000,  20.00, 2, NOW()),
  (gen_random_uuid(), 2025, 'MONTHLY',  300.01,  1000.00, 0.2500,  35.00, 3, NOW()),
  (gen_random_uuid(), 2025, 'MONTHLY', 1000.01,  2000.00, 0.3000,  85.00, 4, NOW()),
  (gen_random_uuid(), 2025, 'MONTHLY', 2000.01,  3000.00, 0.3500, 185.00, 5, NOW()),
  (gen_random_uuid(), 2025, 'MONTHLY', 3000.01,     NULL, 0.4000, 335.00, 6, NOW());

-- ============================================================
-- ANNUAL brackets (6 rows)
-- Example: $32,000/year → $32,000 × 35% − $2,220 = $8,980 ✓
-- ============================================================
INSERT INTO "paye_tax_brackets" ("id","year","tableType","lowerBound","upperBound","rate","deductAmount","sortOrder","updatedAt") VALUES
  (gen_random_uuid(), 2025, 'ANNUAL',     0.00,   1200.00, 0.0000,    0.00, 1, NOW()),
  (gen_random_uuid(), 2025, 'ANNUAL',  1200.01,   3600.00, 0.2000,  240.00, 2, NOW()),
  (gen_random_uuid(), 2025, 'ANNUAL',  3600.01,  12000.00, 0.2500,  420.00, 3, NOW()),
  (gen_random_uuid(), 2025, 'ANNUAL', 12000.01,  24000.00, 0.3000, 1020.00, 4, NOW()),
  (gen_random_uuid(), 2025, 'ANNUAL', 24000.01,  36000.00, 0.3500, 2220.00, 5, NOW()),
  (gen_random_uuid(), 2025, 'ANNUAL', 36000.01,      NULL, 0.4000, 4020.00, 6, NOW());
