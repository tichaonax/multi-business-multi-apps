const fs = require('fs');
const path = require('path');

/**
 * Regenerate the clothing categories migration with fixed seed data
 */

const migrationDir = path.join(__dirname, '../prisma/migrations/20251127140000_seed_complete_clothing_categories');
const migrationFile = path.join(migrationDir, 'migration.sql');
const seedDataDir = path.join(__dirname, '../seed-data/clothing-categories');

// Load the seed data
const domainsData = JSON.parse(fs.readFileSync(path.join(seedDataDir, 'inventory-domains.json'), 'utf8'));
const categoriesData = JSON.parse(fs.readFileSync(path.join(seedDataDir, 'business-categories.json'), 'utf8'));
const subcategoriesData = JSON.parse(fs.readFileSync(path.join(seedDataDir, 'inventory-subcategories.json'), 'utf8'));

console.log(`Loaded ${domainsData.length} domains`);
console.log(`Loaded ${categoriesData.length} categories`);
console.log(`Loaded ${subcategoriesData.length} subcategories`);

// Generate SQL
let sql = `-- Seed Complete Clothing Categories
-- This migration provides comprehensive clothing inventory categories
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING - safe to rerun
-- AUTOMATIC: Runs as part of prisma migrate deploy
--
-- Seeds:
--   - ${domainsData.length} inventory domains (men's, women's, boys, girls, baby, accessories, home, general)
--   - ${categoriesData.length} business categories
--   - ${subcategoriesData.length} inventory subcategories
--

-- ============================================================================
-- INVENTORY DOMAINS
-- ============================================================================

`;

// Add domains
domainsData.forEach(domain => {
  sql += `INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "createdAt")
VALUES (
  '${domain.id}',
  '${domain.name.replace(/'/g, "''")}',
  '${domain.emoji}',
  '${domain.description.replace(/'/g, "''")}',
  '${domain.businessType}',
  ${domain.isActive},
  NOW()
)
ON CONFLICT (id) DO NOTHING;

`;
});

sql += `-- ============================================================================
-- BUSINESS CATEGORIES
-- ============================================================================

`;

// Add categories
categoriesData.forEach(cat => {
  sql += `INSERT INTO business_categories (
  id, name, emoji, description, color, "displayOrder", "domainId",
  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"
)
VALUES (
  '${cat.id}',
  '${cat.name.replace(/'/g, "''")}',
  '${cat.emoji}',
  '${cat.description.replace(/'/g, "''")}',
  '${cat.color}',
  ${cat.displayOrder},
  ${cat.domainId ? `'${cat.domainId}'` : 'NULL'},
  '${cat.businessType}',
  ${cat.isUserCreated},
  ${cat.isActive},
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

`;
});

sql += `-- ============================================================================
-- INVENTORY SUBCATEGORIES
-- ============================================================================

`;

// Add subcategories
subcategoriesData.forEach(subcat => {
  sql += `INSERT INTO inventory_subcategories (
  id, name, "categoryId", emoji, description, "displayOrder", "createdAt"
)
VALUES (
  '${subcat.id}',
  '${subcat.name.replace(/'/g, "''")}',
  '${subcat.categoryId}',
  ${subcat.emoji ? `'${subcat.emoji}'` : 'NULL'},
  '${subcat.description.replace(/'/g, "''")}',
  ${subcat.displayOrder},
  NOW()
)
ON CONFLICT (id) DO NOTHING;

`;
});

// Write the migration file
fs.writeFileSync(migrationFile, sql);
console.log(`\n✓ Generated migration file: ${migrationFile}`);
console.log(`  - ${sql.split('\n').length} lines`);
console.log(`  - ${(Buffer.byteLength(sql, 'utf8') / 1024).toFixed(2)} KB`);
