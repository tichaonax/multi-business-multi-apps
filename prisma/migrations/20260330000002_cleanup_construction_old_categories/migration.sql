-- ============================================================
-- Cleanup old/wrong Construction categories from prior seeding
-- Only removes isUserCreated = false rows — never touches user data
-- The 11 correct categories from 20260330000001 are kept
-- ============================================================

-- Delete subcategories under old categories first
DELETE FROM expense_subcategories
WHERE "categoryId" IN (
  SELECT c.id
  FROM expense_categories c
  JOIN expense_domains d ON c."domainId" = d.id
  WHERE d.name = 'Construction'
    AND c."isUserCreated" = false
    AND c.name NOT IN (
      'General Construction',
      'Structural Work',
      'Plumbing and HVAC',
      'Electrical Work',
      'Finish Work',
      'Civil Construction',
      'Equipment and Machinery',
      'Safety and Compliance',
      'Roofing and Exterior',
      'Project Management and Estimating',
      'Specialty Construction'
    )
);

-- Delete the old categories
DELETE FROM expense_categories
WHERE "domainId" = (SELECT id FROM expense_domains WHERE name = 'Construction')
  AND "isUserCreated" = false
  AND name NOT IN (
    'General Construction',
    'Structural Work',
    'Plumbing and HVAC',
    'Electrical Work',
    'Finish Work',
    'Civil Construction',
    'Equipment and Machinery',
    'Safety and Compliance',
    'Roofing and Exterior',
    'Project Management and Estimating',
    'Specialty Construction'
  );
