const fs = require('fs');
const path = require('path');

/**
 * Test that all null categories have been fixed
 */

const seedFile = path.join(__dirname, '../seed-data/clothing-categories/final-8-departments.json');
const data = JSON.parse(fs.readFileSync(seedFile, 'utf8'));

let totalItems = 0;
let nullCategoryCount = 0;
const nullItems = [];

// Process each department
Object.entries(data.departments).forEach(([deptKey, dept]) => {
  if (!dept.items) return;

  dept.items.forEach(item => {
    totalItems++;
    if (item.categoryName === null) {
      nullCategoryCount++;
      nullItems.push({
        dept: deptKey,
        sku: item.sku,
        product: item.product
      });
    }
  });
});

console.log('\n=== Null Category Test ===');
console.log(`Total items: ${totalItems}`);
console.log(`Items with null categoryName: ${nullCategoryCount}`);

if (nullCategoryCount === 0) {
  console.log('\n✅ SUCCESS: All items have categories assigned!');
  process.exit(0);
} else {
  console.log('\n❌ FAILED: Found items with null categoryName:');
  nullItems.forEach(item => {
    console.log(`  - ${item.dept}: ${item.sku} - ${item.product}`);
  });
  process.exit(1);
}
