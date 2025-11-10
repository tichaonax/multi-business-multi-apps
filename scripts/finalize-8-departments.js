const fs = require('fs');
const path = require('path');

// Read the raw data and current mapping
const analysisFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'raw-data-analysis.json');
const mappingFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'department-mapping.json');

const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf-8'));
const currentMapping = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));

// Define the FINAL 8 departments
const final8Departments = {
  'mens': { emoji: '👨', name: "Men's", description: 'Adult male clothing and fashion', items: [] },
  'womens': { emoji: '👩', name: "Women's", description: 'Adult female clothing and fashion', items: [] },
  'boys': { emoji: '👦', name: "Boys", description: 'Boys clothing and fashion', items: [] },
  'girls': { emoji: '👧', name: "Girls", description: 'Girls clothing and fashion', items: [] },
  'baby': { emoji: '👶', name: "Baby", description: 'Baby and infant clothing (0-24 months)', items: [] },
  'accessories': { emoji: '👔', name: "Accessories", description: 'Fashion accessories, bags, and jewelry', items: [] },
  'home-textiles': { emoji: '🏠', name: "Home & Textiles", description: 'Household soft goods and textiles', items: [] },
  'general-merch': { emoji: '🎯', name: "General Merchandise", description: 'Non-clothing items', items: [] }
};

// Classify each item into one of the 8 final departments
analysis.allItems.forEach(item => {
  const dept = item.department.toLowerCase();
  const cat = (item.categoryName || '').toLowerCase();
  const product = item.product.toLowerCase();
  let targetDept = null;

  // Men's classification
  if (dept.includes('men') && !dept.includes('women')) {
    targetDept = 'mens';
  }
  // Women's classification
  else if (dept.includes('women') || dept.includes('ladies')) {
    targetDept = 'womens';
  }
  // Boys classification
  else if (dept.includes('boy') && !dept.includes('baby')) {
    targetDept = 'boys';
  }
  // Girls classification
  else if (dept.includes('girl') && !dept.includes('baby')) {
    targetDept = 'girls';
  }
  // Baby classification
  else if (dept.includes('baby') || dept.includes('newborn') || dept.includes('toddler')) {
    targetDept = 'baby';
  }
  // Kids - distribute based on product name or category
  else if (dept.includes('kid')) {
    // Try to classify based on product/category keywords
    if (product.includes('boy') || cat.includes('boy')) {
      targetDept = 'boys';
    } else if (product.includes('girl') || cat.includes('girl')) {
      targetDept = 'girls';
    } else if (product.includes('baby') || cat.includes('baby')) {
      targetDept = 'baby';
    } else {
      // Default to baby for general kids items
      targetDept = 'baby';
    }
  }
  // Home & Textiles
  else if (dept.includes('towel') || dept.includes('bedspread') || dept.includes('blanket') ||
           dept.includes('bathroom') || dept.includes('comforter') || dept.includes('fleece') ||
           dept.includes('quilt') || dept.includes('sheet') || dept.includes('sleeping') ||
           dept.includes('wrapper')) {
    targetDept = 'home-textiles';
  }
  // Accessories
  else if (dept.includes('accessories') || dept.includes('bag')) {
    targetDept = 'accessories';
  }
  // General Merchandise
  else if (dept.includes('electronic') || dept.includes('furniture') || dept.includes('kitchen') ||
           dept.includes('phone') || dept.includes('toy') || dept.includes('travel') ||
           dept.includes('computer') || dept.includes('laptop')) {
    targetDept = 'general-merch';
  }
  // Uncategorized - try to classify based on product type
  else {
    // Check product/category for clues
    if (product.includes('men') || product.includes('male')) {
      targetDept = 'mens';
    } else if (product.includes('women') || product.includes('ladies') || product.includes('female')) {
      targetDept = 'womens';
    } else if (product.includes('boy')) {
      targetDept = 'boys';
    } else if (product.includes('girl')) {
      targetDept = 'girls';
    } else if (product.includes('baby') || product.includes('infant')) {
      targetDept = 'baby';
    }
    // Clothing items by type
    else if (dept === 'jumpsuit' || dept === 'rompers' || dept === 'clothing') {
      // Default to women's for these
      targetDept = 'womens';
    } else if (dept === 'shorts' || dept === 'trousers' || dept === 't-shirts') {
      // Check if it's for men or women
      if (product.includes('men')) targetDept = 'mens';
      else if (product.includes('ladies') || product.includes('women')) targetDept = 'womens';
      else targetDept = 'womens'; // Default
    } else if (dept === 'wool' || dept === 'fur') {
      targetDept = 'accessories';
    } else if (dept === 'adult') {
      // Check product for gender
      if (product.includes('men')) targetDept = 'mens';
      else targetDept = 'womens';
    } else {
      // Last resort - default to general merch
      targetDept = 'general-merch';
    }
  }

  if (targetDept && final8Departments[targetDept]) {
    final8Departments[targetDept].items.push(item);
  } else {
    console.warn(`Could not classify: ${item.department} - ${item.product}`);
  }
});

// Generate statistics
const stats = Object.entries(final8Departments).map(([key, dept]) => ({
  key,
  emoji: dept.emoji,
  name: dept.name,
  itemCount: dept.items.length,
  uniqueCategories: new Set(dept.items.map(i => i.categoryName)).size,
  uniqueSubcategories: new Set(dept.items.map(i => i.subcategory).filter(Boolean)).size
})).sort((a, b) => b.itemCount - a.itemCount);

// Print report
console.log('=== FINAL 8 DEPARTMENTS ===\n');

console.log('📊 DEPARTMENT DISTRIBUTION');
console.log('─'.repeat(70));
stats.forEach((dept, idx) => {
  console.log(`${idx + 1}. ${dept.emoji} ${dept.name}`);
  console.log(`   Items: ${dept.itemCount}`);
  console.log(`   Categories: ${dept.uniqueCategories}`);
  console.log(`   Subcategories: ${dept.uniqueSubcategories}`);
  console.log('');
});

const totalItems = stats.reduce((sum, dept) => sum + dept.itemCount, 0);
console.log(`Total Items: ${totalItems} / ${analysis.summary.totalItems}`);
console.log(`Coverage: ${((totalItems / analysis.summary.totalItems) * 100).toFixed(1)}%`);
console.log('');

// Save the final classification
const outputData = {
  departments: final8Departments,
  stats,
  summary: {
    totalItems,
    originalItems: analysis.summary.totalItems,
    coverage: ((totalItems / analysis.summary.totalItems) * 100).toFixed(1) + '%'
  }
};

const outputFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'final-8-departments.json');
fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));

console.log('📁 OUTPUT');
console.log('─'.repeat(70));
console.log(`Final 8 departments data saved to:`);
console.log(`  ${outputFile}`);
console.log('');

// Show sample items from each department
console.log('📦 SAMPLE ITEMS FROM EACH DEPARTMENT');
console.log('─'.repeat(70));
Object.entries(final8Departments).forEach(([key, dept]) => {
  if (dept.items.length > 0) {
    console.log(`\n${dept.emoji} ${dept.name} (${dept.items.length} items)`);
    dept.items.slice(0, 3).forEach(item => {
      console.log(`  - ${item.product} (${item.sku})`);
      console.log(`    Category: ${item.category}`);
    });
    if (dept.items.length > 3) {
      console.log(`  ... and ${dept.items.length - 3} more items`);
    }
  }
});
