const fs = require('fs');
const path = require('path');

const errorsFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'import-errors.json');
const errors = JSON.parse(fs.readFileSync(errorsFile, 'utf-8'));

console.log('=== IMPORT ERROR ANALYSIS ===\n');
console.log(`Total Errors: ${errors.length}\n`);

// Analyze missing categories
const missingCategories = {};
const missingByDomain = {};

errors.forEach(err => {
  const match = err.error.match(/Category not found: (.+) in domain (.+)/);
  if (match) {
    const category = match[1];
    const domain = match[2];

    missingCategories[category] = (missingCategories[category] || 0) + 1;

    if (!missingByDomain[domain]) {
      missingByDomain[domain] = {};
    }
    missingByDomain[domain][category] = (missingByDomain[domain][category] || 0) + 1;
  }
});

// Sort by frequency
const sortedCategories = Object.entries(missingCategories).sort((a, b) => b[1] - a[1]);

console.log('📊 MISSING CATEGORIES (Top 30)');
console.log('─'.repeat(70));
sortedCategories.slice(0, 30).forEach(([cat, count]) => {
  console.log(`  ${count.toString().padStart(3, ' ')} items - ${cat}`);
});

console.log('\n\n📂 MISSING CATEGORIES BY DOMAIN');
console.log('─'.repeat(70));

Object.entries(missingByDomain).forEach(([domain, cats]) => {
  const domainName = domain.replace('domain_clothing_', '');
  const totalMissing = Object.values(cats).reduce((sum, val) => sum + val, 0);

  console.log(`\n${domainName.toUpperCase()} (${totalMissing} items missing categories):`);

  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  sorted.slice(0, 10).forEach(([cat, count]) => {
    console.log(`  ${count.toString().padStart(3, ' ')} - ${cat}`);
  });

  if (sorted.length > 10) {
    console.log(`  ... and ${sorted.length - 10} more categories`);
  }
});

console.log('\n');
