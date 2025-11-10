const fs = require('fs');
const path = require('path');

// Read the clothing data file
const dataFile = path.join(__dirname, '..', 'ai-contexts', 'wip', 'clothing-category-data.md');
const data = fs.readFileSync(dataFile, 'utf-8');
const lines = data.split('\n').slice(1); // Skip header

// Data structures
const items = [];
const skus = new Map(); // Track SKU occurrences
const departments = new Map();
const categoryPaths = new Set();

// Parse the data
lines.forEach((line, index) => {
  const parts = line.split('\t');
  if (parts.length >= 4) {
    const product = parts[0].trim();
    const sku = parts[2].trim();
    const category = parts[3].trim();

    if (!product || !sku || !category) return;

    // Track SKU occurrences
    if (!skus.has(sku)) {
      skus.set(sku, []);
    }
    skus.get(sku).push({ product, category, lineNumber: index + 2 });

    // Parse category path (e.g., "Baby Girl > Dresses")
    const catParts = category.split('>').map(p => p.trim());
    const dept = catParts[0];
    const cat = catParts[1] || null;
    const subcat = catParts[2] || null;

    // Track departments and their categories
    if (!departments.has(dept)) {
      departments.set(dept, {
        categories: new Map(),
        count: 0
      });
    }
    departments.get(dept).count++;

    if (cat) {
      const deptData = departments.get(dept);
      if (!deptData.categories.has(cat)) {
        deptData.categories.set(cat, new Set());
      }
      if (subcat) {
        deptData.categories.get(cat).add(subcat);
      }
    }

    categoryPaths.add(category);

    items.push({
      product,
      sku,
      category,
      department: dept,
      categoryName: cat,
      subcategory: subcat
    });
  }
});

// Find duplicates
const duplicates = Array.from(skus.entries())
  .filter(([sku, occurrences]) => occurrences.length > 1)
  .map(([sku, occurrences]) => ({ sku, occurrences }));

// Generate report
console.log('=== CLOTHING DATA ANALYSIS REPORT ===\n');

console.log('📊 SUMMARY STATISTICS');
console.log('─'.repeat(60));
console.log(`Total Items: ${items.length}`);
console.log(`Unique SKUs: ${skus.size}`);
console.log(`Duplicate SKUs: ${duplicates.length}`);
console.log(`Unique Departments: ${departments.size}`);
console.log(`Unique Category Paths: ${categoryPaths.size}`);
console.log('');

console.log('🏢 DEPARTMENTS BREAKDOWN');
console.log('─'.repeat(60));
const sortedDepts = Array.from(departments.entries())
  .sort((a, b) => b[1].count - a[1].count);

sortedDepts.forEach(([dept, data]) => {
  console.log(`${dept}`);
  console.log(`  Items: ${data.count}`);
  console.log(`  Categories: ${data.categories.size}`);

  // Show top 5 categories
  const sortedCats = Array.from(data.categories.entries())
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 5);

  sortedCats.forEach(([cat, subcats]) => {
    console.log(`    - ${cat} (${subcats.size} subcategories)`);
  });

  if (data.categories.size > 5) {
    console.log(`    ... and ${data.categories.size - 5} more categories`);
  }
  console.log('');
});

console.log('🔍 DUPLICATE SKUs (First 20)');
console.log('─'.repeat(60));
duplicates.slice(0, 20).forEach(({ sku, occurrences }) => {
  console.log(`${sku}: ${occurrences.length} occurrences`);
  occurrences.forEach(({ product, category }) => {
    console.log(`  - ${product} (${category})`);
  });
  console.log('');
});

if (duplicates.length > 20) {
  console.log(`... and ${duplicates.length - 20} more duplicate SKUs\n`);
}

// Save detailed analysis to JSON
const analysis = {
  summary: {
    totalItems: items.length,
    uniqueSkus: skus.size,
    duplicateSkus: duplicates.length,
    uniqueDepartments: departments.size,
    uniqueCategoryPaths: categoryPaths.size
  },
  departments: Array.from(departments.entries()).map(([name, data]) => ({
    name,
    itemCount: data.count,
    categories: Array.from(data.categories.entries()).map(([cat, subcats]) => ({
      name: cat,
      subcategories: Array.from(subcats)
    }))
  })),
  duplicateSkus: duplicates,
  allItems: items
};

const outputDir = path.join(__dirname, '..', 'seed-data', 'clothing-categories');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputFile = path.join(outputDir, 'raw-data-analysis.json');
fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));

console.log('📁 OUTPUT');
console.log('─'.repeat(60));
console.log(`Detailed analysis saved to:`);
console.log(`  ${outputFile}`);
console.log('');
