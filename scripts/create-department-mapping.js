const fs = require('fs');
const path = require('path');

// Define the 8 target departments
const targetDepartments = {
  'mens': {
    emoji: '👨',
    name: "Men's",
    description: 'Adult male clothing and fashion',
    sourcePatterns: ['Men', 'Men\'s', 'Men Clothing', 'Men Body Clothes', 'Men Legs Clothes', 'Men Outerwear', 'Men Underwear', 'Men Footwear', 'Men Accessories']
  },
  'womens': {
    emoji: '👩',
    name: "Women's",
    description: 'Adult female clothing and fashion',
    sourcePatterns: ['Ladies', 'Women', 'Women Clothing', 'Women Footwear', 'Women Accessories', 'Women Underwear', 'Women Shoes']
  },
  'boys': {
    emoji: '👦',
    name: "Boys",
    description: 'Boys clothing and fashion',
    sourcePatterns: ['Boys', 'Kid Boy', 'Toddler Boy', 'Boy']
  },
  'girls': {
    emoji: '👧',
    name: "Girls",
    description: 'Girls clothing and fashion',
    sourcePatterns: ['Girls', 'Kid Girl', 'Toddler Girl']
  },
  'baby': {
    emoji: '👶',
    name: "Baby",
    description: 'Baby and infant clothing (0-24 months)',
    sourcePatterns: ['Baby', 'Baby Boy', 'Baby Girl', 'Baby Uni Sex', 'Newborn', 'New Born', 'Toddler']
  },
  'kids': {
    emoji: '👧',
    name: "Kids",
    description: 'General kids clothing',
    sourcePatterns: ['Kids', 'Kid']
  },
  'accessories': {
    emoji: '👔',
    name: "Accessories",
    description: 'Fashion accessories, bags, and jewelry',
    sourcePatterns: ['Accessories', 'Carry Bags', 'Kids Accessories', 'Laptop Accessories']
  },
  'home-textiles': {
    emoji: '🏠',
    name: "Home & Textiles",
    description: 'Household soft goods and textiles',
    sourcePatterns: ['Bath Towels', 'Bathing', 'Bathroom', 'Bedspread', 'Blankets', 'Comforter', 'Fleece', 'Quilts', 'Sheets', 'Sleeping Bag', 'Wrapper']
  },
  'general-merch': {
    emoji: '🎯',
    name: "General Merchandise",
    description: 'Non-clothing items',
    sourcePatterns: ['Computer Accessories', 'Electronics', 'Furniture', 'General Merchandise', 'Kitchen', 'Mobile Phones', 'Toys', 'Travel']
  },
  'uncategorized': {
    emoji: '📦',
    name: "Uncategorized",
    description: 'Items that need manual categorization',
    sourcePatterns: ['Clothing', 'Jumpsuit', 'Rompers', 'Mixed Clothes', 'Shorts', 'T-Shirts', 'Trousers', 'Adult', 'Raffles Clothes', 'Wool', 'Fur']
  }
};

// Read the raw analysis
const analysisFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'raw-data-analysis.json');
const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf-8'));

// Create department mapping
const departmentMapping = {};
const unmappedDepartments = [];

analysis.departments.forEach(dept => {
  const deptName = dept.name;
  let mapped = false;

  // Try to match against target departments
  for (const [key, target] of Object.entries(targetDepartments)) {
    // Check if department name matches any pattern
    const matches = target.sourcePatterns.some(pattern => {
      // Exact match
      if (pattern === deptName) return true;
      // Starts with pattern
      if (deptName.startsWith(pattern)) return true;
      // Contains pattern
      if (deptName.includes(pattern)) return true;
      return false;
    });

    if (matches) {
      departmentMapping[deptName] = {
        targetDepartment: key,
        targetName: target.name,
        targetEmoji: target.emoji,
        itemCount: dept.itemCount,
        categoryCount: dept.categories.length
      };
      mapped = true;
      break;
    }
  }

  if (!mapped) {
    unmappedDepartments.push({
      name: deptName,
      itemCount: dept.itemCount,
      categoryCount: dept.categories.length
    });
  }
});

// Generate statistics
const stats = {
  totalSourceDepartments: analysis.departments.length,
  mappedDepartments: Object.keys(departmentMapping).length,
  unmappedDepartments: unmappedDepartments.length,
  targetDepartments: Object.keys(targetDepartments).length
};

// Group by target department
const byTargetDept = {};
Object.entries(departmentMapping).forEach(([source, mapping]) => {
  const target = mapping.targetDepartment;
  if (!byTargetDept[target]) {
    byTargetDept[target] = {
      targetName: mapping.targetName,
      targetEmoji: mapping.targetEmoji,
      sourceDepartments: [],
      totalItems: 0,
      totalCategories: 0
    };
  }
  byTargetDept[target].sourceDepartments.push(source);
  byTargetDept[target].totalItems += mapping.itemCount;
  byTargetDept[target].totalCategories += mapping.categoryCount;
});

// Print report
console.log('=== DEPARTMENT MAPPING REPORT ===\n');

console.log('📊 MAPPING STATISTICS');
console.log('─'.repeat(70));
console.log(`Source Departments: ${stats.totalSourceDepartments}`);
console.log(`Mapped Departments: ${stats.mappedDepartments}`);
console.log(`Unmapped Departments: ${stats.unmappedDepartments}`);
console.log(`Target Departments: ${stats.targetDepartments}`);
console.log('');

console.log('🎯 TARGET DEPARTMENTS (What we\'ll end up with)');
console.log('─'.repeat(70));
Object.entries(byTargetDept)
  .sort((a, b) => b[1].totalItems - a[1].totalItems)
  .forEach(([key, data]) => {
    console.log(`\n${data.targetEmoji} ${data.targetName}`);
    console.log(`  Total Items: ${data.totalItems}`);
    console.log(`  Total Categories: ${data.totalCategories}`);
    console.log(`  Source Departments (${data.sourceDepartments.length}):`);
    data.sourceDepartments.forEach(src => {
      const srcData = departmentMapping[src];
      console.log(`    - ${src} (${srcData.itemCount} items)`);
    });
  });

if (unmappedDepartments.length > 0) {
  console.log('\n\n⚠️  UNMAPPED DEPARTMENTS (Need Manual Review)');
  console.log('─'.repeat(70));
  unmappedDepartments
    .sort((a, b) => b.itemCount - a.itemCount)
    .forEach(dept => {
      console.log(`  ${dept.name}: ${dept.itemCount} items, ${dept.categoryCount} categories`);
    });
  console.log('\nThese departments don\'t match any target pattern.');
  console.log('They will be mapped to "Uncategorized" or need manual classification.');
}

// Save mapping to file
const mappingOutput = {
  stats,
  targetDepartments,
  departmentMapping,
  byTargetDept,
  unmappedDepartments
};

const outputFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'department-mapping.json');
fs.writeFileSync(outputFile, JSON.stringify(mappingOutput, null, 2));

console.log('\n\n📁 OUTPUT');
console.log('─'.repeat(70));
console.log(`Department mapping saved to:`);
console.log(`  ${outputFile}`);
console.log('');

// Summary for the 8 final departments
console.log('📋 FINAL 8 DEPARTMENTS SUMMARY');
console.log('─'.repeat(70));
const finalDepts = [
  'mens', 'womens', 'boys', 'girls', 'baby', 'accessories', 'home-textiles', 'general-merch'
].map(key => byTargetDept[key] || { targetName: targetDepartments[key].name, targetEmoji: targetDepartments[key].emoji, totalItems: 0 });

finalDepts.forEach((dept, idx) => {
  console.log(`${idx + 1}. ${dept.targetEmoji} ${dept.targetName}: ${dept.totalItems || 0} items`);
});

const totalMapped = finalDepts.reduce((sum, dept) => sum + (dept.totalItems || 0), 0);
console.log(`\nTotal Mapped Items: ${totalMapped} / ${analysis.summary.totalItems}`);
console.log(`Coverage: ${((totalMapped / analysis.summary.totalItems) * 100).toFixed(1)}%`);
