const fs = require('fs');
const path = require('path');

/**
 * Generate SQL migration file from clothing category JSON data
 * This creates a proper migration that can be run with `npx prisma migrate deploy`
 */

function escapeString(str) {
  if (!str) return "''";
  return "'" + str.replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

function generateMigrationSQL() {
  // Load seed data
  const seedDataFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'complete-seed-data.json');
  const seedData = JSON.parse(fs.readFileSync(seedDataFile, 'utf-8'));

  let sql = `-- Seed Complete Clothing Categories
-- This migration provides comprehensive clothing inventory categories
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING - safe to rerun
-- AUTOMATIC: Runs as part of prisma migrate deploy
--
-- Seeds:
--   - 8 inventory domains (men's, women's, boys, girls, baby, accessories, home, general)
--   - 387 business categories
--   - 531 inventory subcategories
--

`;

  // 1. Seed Inventory Domains
  sql += `-- ============================================================================\n`;
  sql += `-- INVENTORY DOMAINS\n`;
  sql += `-- ============================================================================\n\n`;

  for (const domain of seedData.inventoryDomains) {
    sql += `INSERT INTO inventory_domains (id, name, emoji, description, "businessType", "isActive", "createdAt")\n`;
    sql += `VALUES (\n`;
    sql += `  ${escapeString(domain.id)},\n`;
    sql += `  ${escapeString(domain.name)},\n`;
    sql += `  ${escapeString(domain.emoji)},\n`;
    sql += `  ${escapeString(domain.description)},\n`;
    sql += `  ${escapeString(domain.businessType)},\n`;
    sql += `  true,\n`;
    sql += `  NOW()\n`;
    sql += `)\n`;
    sql += `ON CONFLICT (id) DO NOTHING;\n\n`;
  }

  // 2. Seed Business Categories
  sql += `-- ============================================================================\n`;
  sql += `-- BUSINESS CATEGORIES\n`;
  sql += `-- ============================================================================\n\n`;

  for (const category of seedData.businessCategories) {
    sql += `INSERT INTO business_categories (\n`;
    sql += `  id, name, emoji, description, color, "displayOrder", "domainId",\n`;
    sql += `  "businessType", "isUserCreated", "isActive", "createdAt", "updatedAt"\n`;
    sql += `)\n`;
    sql += `VALUES (\n`;
    sql += `  ${escapeString(category.id)},\n`;
    sql += `  ${escapeString(category.name)},\n`;
    sql += `  ${escapeString(category.emoji)},\n`;
    sql += `  ${escapeString(category.description)},\n`;
    sql += `  ${escapeString(category.color)},\n`;
    sql += `  ${category.displayOrder || 999},\n`;
    sql += `  ${escapeString(category.domainId)},\n`;
    sql += `  ${escapeString(category.businessType)},\n`;
    sql += `  ${category.isUserCreated ? 'true' : 'false'},\n`;
    sql += `  ${category.isActive ? 'true' : 'false'},\n`;
    sql += `  NOW(),\n`;
    sql += `  NOW()\n`;
    sql += `)\n`;
    sql += `ON CONFLICT ("businessType", name) DO NOTHING;\n\n`;
  }

  // 3. Seed Inventory Subcategories
  sql += `-- ============================================================================\n`;
  sql += `-- INVENTORY SUBCATEGORIES\n`;
  sql += `-- ============================================================================\n\n`;

  for (const subcategory of seedData.inventorySubcategories) {
    sql += `INSERT INTO inventory_subcategories (\n`;
    sql += `  id, name, emoji, description, "displayOrder", "categoryId", "isDefault", "createdAt"\n`;
    sql += `)\n`;
    sql += `VALUES (\n`;
    sql += `  ${escapeString(subcategory.id)},\n`;
    sql += `  ${escapeString(subcategory.name)},\n`;
    sql += `  ${escapeString(subcategory.emoji)},\n`;
    sql += `  ${escapeString(subcategory.description)},\n`;
    sql += `  ${subcategory.displayOrder || 999},\n`;
    sql += `  ${escapeString(subcategory.categoryId)},\n`;
    sql += `  ${subcategory.isDefault ? 'true' : 'false'},\n`;
    sql += `  NOW()\n`;
    sql += `)\n`;
    sql += `ON CONFLICT (id) DO NOTHING;\n\n`;
  }

  return sql;
}

// Generate and write the migration file
try {
  const migrationSQL = generateMigrationSQL();
  const outputPath = path.join(__dirname, '..', 'prisma', 'migrations', '20251127140000_seed_complete_clothing_categories', 'migration.sql');

  fs.writeFileSync(outputPath, migrationSQL);

  console.log('✅ Migration file generated successfully!');
  console.log(`   Location: ${outputPath}`);
  console.log('');
  console.log('📋 To apply this migration:');
  console.log('   npx prisma migrate deploy');
  console.log('');
  console.log('   Or run migrations via setup:');
  console.log('   node scripts/setup-fresh-install.js');
} catch (error) {
  console.error('❌ Error generating migration:', error);
  process.exit(1);
}
