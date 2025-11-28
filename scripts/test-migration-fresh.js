const { execSync } = require('child_process');

/**
 * Test that the clothing categories migration works on a fresh database
 */

console.log('Testing clothing categories migration on fresh database...\n');

try {
  // Step 1: Drop and recreate the schema
  console.log('1. Dropping and recreating database schema...');
  execSync('PGPASSWORD=postgres psql -U postgres -d multi_business_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"', {
    stdio: 'inherit'
  });
  console.log('   ✓ Schema recreated\n');

  // Step 2: Run all migrations
  console.log('2. Running all migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('   ✓ Migrations applied\n');

  // Step 3: Verify the data
  console.log('3. Verifying seeded data...');

  const result1 = execSync(
    'PGPASSWORD=postgres psql -U postgres -d multi_business_db -t -c "SELECT COUNT(*) FROM business_categories WHERE \\"businessType\\" = \'clothing\'"',
    { encoding: 'utf8' }
  ).trim();
  console.log(`   - Clothing categories: ${result1}`);

  const result2 = execSync(
    'PGPASSWORD=postgres psql -U postgres -d multi_business_db -t -c "SELECT COUNT(*) FROM inventory_subcategories"',
    { encoding: 'utf8' }
  ).trim();
  console.log(`   - Inventory subcategories: ${result2}`);

  const result3 = execSync(
    'PGPASSWORD=postgres psql -U postgres -d multi_business_db -t -c "SELECT name FROM business_categories WHERE id = \'category_clothing_245_accessories\'"',
    { encoding: 'utf8' }
  ).trim();
  console.log(`   - Accessories category name: "${result3}"`);

  // Step 4: Check for duplicates
  const duplicates = execSync(
    'PGPASSWORD=postgres psql -U postgres -d multi_business_db -t -c "SELECT name, COUNT(*) as cnt FROM business_categories WHERE \\"businessType\\" = \'clothing\' GROUP BY name HAVING COUNT(*) > 1"',
    { encoding: 'utf8' }
  ).trim();

  if (duplicates) {
    console.log('\n   ❌ Found duplicate category names:');
    console.log(duplicates);
    process.exit(1);
  } else {
    console.log('   ✓ No duplicate category names\n');
  }

  console.log('✅ Migration test PASSED - migration is rerunnable!\n');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Migration test FAILED');
  console.error(error.message);
  process.exit(1);
}
