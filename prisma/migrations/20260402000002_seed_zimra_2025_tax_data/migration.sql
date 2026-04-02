-- Seed: ZIMRA 2025 PAYE tax tables (all 5 types, 6 brackets each = 30 rows)
-- and payroll_tax_constants for 2025
-- Source: ZIMRA 2025 Tax Tables

-- ============================================================
-- payroll_tax_constants — 2025 rates
-- ============================================================
INSERT INTO "payroll_tax_constants" ("id", "year", "aidsLevyRate", "nssaEmployeeRate", "nssaEmployerRate", "updatedAt")
VALUES (gen_random_uuid(), 2025, 0.0300, 0.0450, 0.0450, NOW())
ON CONFLICT ("year") DO NOTHING;

-- ============================================================
-- DAILY brackets (6 rows)
-- ============================================================
INSERT INTO "paye_tax_brackets" ("id","year","tableType","lowerBound","upperBound","rate","deductAmount","sortOrder","updatedAt") VALUES
  (gen_random_uuid(), 2025, 'DAILY',    0.00,  2.74, 0.0000,  0.00, 1, NOW()),
  (gen_random_uuid(), 2025, 'DAILY',    2.75,  5.48, 0.2000,  0.55, 2, NOW()),
  (gen_random_uuid(), 2025, 'DAILY',    5.49, 10.96, 0.2500,  0.82, 3, NOW()),
  (gen_random_uuid(), 2025, 'DAILY',   10.97, 21.92, 0.3000,  1.37, 4, NOW()),
  (gen_random_uuid(), 2025, 'DAILY',   21.93, 32.88, 0.3500,  2.47, 5, NOW()),
  (gen_random_uuid(), 2025, 'DAILY',   32.89,  NULL, 0.4000,  4.12, 6, NOW());

-- ============================================================
-- WEEKLY brackets (6 rows)
-- ============================================================
INSERT INTO "paye_tax_brackets" ("id","year","tableType","lowerBound","upperBound","rate","deductAmount","sortOrder","updatedAt") VALUES
  (gen_random_uuid(), 2025, 'WEEKLY',   0.00,  19.23, 0.0000,   0.00, 1, NOW()),
  (gen_random_uuid(), 2025, 'WEEKLY',  19.24,  38.46, 0.2000,   3.85, 2, NOW()),
  (gen_random_uuid(), 2025, 'WEEKLY',  38.47,  76.92, 0.2500,   5.77, 3, NOW()),
  (gen_random_uuid(), 2025, 'WEEKLY',  76.93, 153.85, 0.3000,   9.62, 4, NOW()),
  (gen_random_uuid(), 2025, 'WEEKLY', 153.86, 230.77, 0.3500,  17.31, 5, NOW()),
  (gen_random_uuid(), 2025, 'WEEKLY', 230.78,   NULL, 0.4000,  28.85, 6, NOW());

-- ============================================================
-- FORTNIGHTLY brackets (6 rows)
-- ============================================================
INSERT INTO "paye_tax_brackets" ("id","year","tableType","lowerBound","upperBound","rate","deductAmount","sortOrder","updatedAt") VALUES
  (gen_random_uuid(), 2025, 'FORTNIGHTLY',   0.00,  38.46, 0.0000,   0.00, 1, NOW()),
  (gen_random_uuid(), 2025, 'FORTNIGHTLY',  38.47,  76.92, 0.2000,   7.69, 2, NOW()),
  (gen_random_uuid(), 2025, 'FORTNIGHTLY',  76.93, 153.85, 0.2500,  11.54, 3, NOW()),
  (gen_random_uuid(), 2025, 'FORTNIGHTLY', 153.86, 307.69, 0.3000,  19.23, 4, NOW()),
  (gen_random_uuid(), 2025, 'FORTNIGHTLY', 307.70, 461.54, 0.3500,  34.62, 5, NOW()),
  (gen_random_uuid(), 2025, 'FORTNIGHTLY', 461.55,   NULL, 0.4000,  57.69, 6, NOW());

-- ============================================================
-- MONTHLY brackets (6 rows)
-- ============================================================
INSERT INTO "paye_tax_brackets" ("id","year","tableType","lowerBound","upperBound","rate","deductAmount","sortOrder","updatedAt") VALUES
  (gen_random_uuid(), 2025, 'MONTHLY',    0.00,   83.33, 0.0000,    0.00, 1, NOW()),
  (gen_random_uuid(), 2025, 'MONTHLY',   83.34,  166.67, 0.2000,   16.67, 2, NOW()),
  (gen_random_uuid(), 2025, 'MONTHLY',  166.68,  333.33, 0.2500,   25.00, 3, NOW()),
  (gen_random_uuid(), 2025, 'MONTHLY',  333.34,  666.67, 0.3000,   41.67, 4, NOW()),
  (gen_random_uuid(), 2025, 'MONTHLY',  666.68, 1000.00, 0.3500,   75.00, 5, NOW()),
  (gen_random_uuid(), 2025, 'MONTHLY', 1000.01,    NULL, 0.4000,  125.00, 6, NOW());

-- ============================================================
-- ANNUAL brackets (6 rows)
-- ============================================================
INSERT INTO "paye_tax_brackets" ("id","year","tableType","lowerBound","upperBound","rate","deductAmount","sortOrder","updatedAt") VALUES
  (gen_random_uuid(), 2025, 'ANNUAL',     0.00,   1000.00, 0.0000,     0.00, 1, NOW()),
  (gen_random_uuid(), 2025, 'ANNUAL',  1000.01,   2000.00, 0.2000,   200.00, 2, NOW()),
  (gen_random_uuid(), 2025, 'ANNUAL',  2000.01,   4000.00, 0.2500,   300.00, 3, NOW()),
  (gen_random_uuid(), 2025, 'ANNUAL',  4000.01,   8000.00, 0.3000,   500.00, 4, NOW()),
  (gen_random_uuid(), 2025, 'ANNUAL',  8000.01,  12000.00, 0.3500,   900.00, 5, NOW()),
  (gen_random_uuid(), 2025, 'ANNUAL', 12000.01,      NULL, 0.4000,  1500.00, 6, NOW());
