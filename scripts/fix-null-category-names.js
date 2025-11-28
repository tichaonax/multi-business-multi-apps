const fs = require('fs');
const path = require('path');

/**
 * Fix null categoryName values in clothing seed data
 * Infers category from product name
 */

const seedFile = path.join(__dirname, '../seed-data/clothing-categories/final-8-departments.json');
const data = JSON.parse(fs.readFileSync(seedFile, 'utf8'));

// Category inference mapping - extract category from product name
const categoryPatterns = [
  // Beach items
  { pattern: /^Beach Shorts/i, category: 'Shorts' },
  { pattern: /^Beach Skirts/i, category: 'Skirts' },
  { pattern: /^Beach Trousers/i, category: 'Trousers' },
  { pattern: /^Beach Shirts/i, category: 'Shirts' },
  { pattern: /^Beachwear/i, category: 'Clothing' },

  // Specific items
  { pattern: /Quilts/i, category: 'Home & Beauty' },
  { pattern: /Ladies Panties/i, category: 'Panties' },
  { pattern: /Trousers For/i, category: 'Trousers' },
  { pattern: /Newborn Socks/i, category: 'Socks' },
  { pattern: /Fashion Skirts/i, category: 'Skirts' },
  { pattern: /Jag Inn/i, category: 'Clothing' },
  { pattern: /Work Suits/i, category: 'Suits' },
  { pattern: /Dress For/i, category: 'Dresses' },
  { pattern: /Beauty :/i, category: 'Home & Beauty' },
  { pattern: /Sandals/i, category: 'Sandals' },
  { pattern: /Jeans/i, category: 'Jeans' },

  // Generic fallback
  { pattern: /.+/, category: 'Uncategorized' }
];

let fixedCount = 0;
const fixes = [];

// Process each department
Object.entries(data.departments).forEach(([deptKey, dept]) => {
  if (!dept.items) return;

  dept.items.forEach(item => {
    if (item.categoryName === null) {
      // Try to infer category from product name
      for (const { pattern, category } of categoryPatterns) {
        if (pattern.test(item.product)) {
          const oldValue = item.categoryName;
          item.categoryName = category;
          fixedCount++;
          fixes.push({
            dept: deptKey,
            sku: item.sku,
            product: item.product,
            oldCategory: oldValue,
            newCategory: category
          });
          break;
        }
      }
    }
  });
});

// Write updated data back
fs.writeFileSync(seedFile, JSON.stringify(data, null, 2));

console.log(`\n✅ Fixed ${fixedCount} items with null categoryName\n`);
console.log('Fixes applied:');
console.log('─'.repeat(100));

fixes.forEach(fix => {
  console.log(`${fix.dept.padEnd(15)} | ${fix.sku.padEnd(10)} | ${fix.newCategory.padEnd(20)} | ${fix.product.substring(0, 50)}`);
});

console.log('\n✓ Updated file:', seedFile);
