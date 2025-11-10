const fs = require('fs');
const path = require('path');

// Read the final classified data
const final8File = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'final-8-departments.json');
const final8Data = JSON.parse(fs.readFileSync(final8File, 'utf-8'));

console.log('=== CLOTHING CATEGORY SEED DATA GENERATION ===\n');

// Define the 8 InventoryDomains
const inventoryDomains = [
  {
    id: 'domain_clothing_mens',
    name: "Men's",
    emoji: '🕴️',
    description: 'Adult male clothing and fashion',
    businessType: 'clothing',
    isActive: true,
    isSystemTemplate: true
  },
  {
    id: 'domain_clothing_womens',
    name: "Women's",
    emoji: '👗',
    description: 'Adult female clothing and fashion',
    businessType: 'clothing',
    isActive: true,
    isSystemTemplate: true
  },
  {
    id: 'domain_clothing_boys',
    name: 'Boys',
    emoji: '👦',
    description: 'Boys clothing and fashion',
    businessType: 'clothing',
    isActive: true,
    isSystemTemplate: true
  },
  {
    id: 'domain_clothing_girls',
    name: 'Girls',
    emoji: '👧',
    description: 'Girls clothing and fashion',
    businessType: 'clothing',
    isActive: true,
    isSystemTemplate: true
  },
  {
    id: 'domain_clothing_baby',
    name: 'Baby',
    emoji: '🍼',
    description: 'Baby and infant clothing (0-24 months)',
    businessType: 'clothing',
    isActive: true,
    isSystemTemplate: true
  },
  {
    id: 'domain_clothing_accessories',
    name: 'Fashion Accessories',
    emoji: '👜',
    description: 'Fashion accessories, bags, and jewelry',
    businessType: 'clothing',
    isActive: true,
    isSystemTemplate: true
  },
  {
    id: 'domain_clothing_home_textiles',
    name: 'Home & Textiles',
    emoji: '🏠',
    description: 'Household soft goods and textiles',
    businessType: 'clothing',
    isActive: true,
    isSystemTemplate: true
  },
  {
    id: 'domain_clothing_general_merch',
    name: 'General Merchandise',
    emoji: '🎯',
    description: 'Non-clothing items',
    businessType: 'clothing',
    isActive: true,
    isSystemTemplate: true
  }
];

// Map department keys to domain IDs
const deptToDomainId = {
  'mens': 'domain_clothing_mens',
  'womens': 'domain_clothing_womens',
  'boys': 'domain_clothing_boys',
  'girls': 'domain_clothing_girls',
  'baby': 'domain_clothing_baby',
  'accessories': 'domain_clothing_accessories',
  'home-textiles': 'domain_clothing_home_textiles',
  'general-merch': 'domain_clothing_general_merch'
};

// Extract categories and subcategories from the data
const categoriesMap = new Map(); // categoryName -> { domainId, items }
const subcategoriesMap = new Map(); // `${categoryName}|${subcategoryName}` -> items

Object.entries(final8Data.departments).forEach(([deptKey, dept]) => {
  const domainId = deptToDomainId[deptKey];

  dept.items.forEach(item => {
    const categoryName = item.categoryName || 'Uncategorized';
    const subcategoryName = item.subcategory;

    // Track category
    const catKey = `${domainId}|${categoryName}`;
    if (!categoriesMap.has(catKey)) {
      categoriesMap.set(catKey, {
        name: categoryName,
        domainId: domainId,
        items: []
      });
    }
    categoriesMap.get(catKey).items.push(item);

    // Track subcategory
    if (subcategoryName) {
      const subCatKey = `${catKey}|${subcategoryName}`;
      if (!subcategoriesMap.has(subCatKey)) {
        subcategoriesMap.set(subCatKey, {
          categoryName: categoryName,
          subcategoryName: subcategoryName,
          domainId: domainId,
          items: []
        });
      }
      subcategoriesMap.get(subCatKey).items.push(item);
    }
  });
});

// Generate BusinessCategories seed data
const businessCategories = [];
let categoryIndex = 0;

Array.from(categoriesMap.entries())
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([key, catData]) => {
    const [domainId, categoryName] = key.split('|');

    businessCategories.push({
      id: `category_clothing_${categoryIndex++}_${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      businessId: null, // System template, not business-specific
      name: categoryName,
      description: `${categoryName} category`,
      parentId: null,
      displayOrder: categoryIndex,
      isActive: true,
      businessType: 'clothing',
      emoji: '👔', // Default emoji, can be customized
      color: '#3B82F6',
      domainId: domainId,
      isUserCreated: false,
      createdBy: null
    });
  });

// Generate InventorySubcategories seed data
const inventorySubcategories = [];
let subcategoryIndex = 0;

Array.from(subcategoriesMap.entries())
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([key, subCatData]) => {
    const parts = key.split('|');
    const subcategoryName = parts[2];
    const categoryName = subCatData.categoryName;

    // Find the category ID
    const category = businessCategories.find(c => c.name === categoryName && c.domainId === subCatData.domainId);

    if (category) {
      inventorySubcategories.push({
        id: `subcategory_clothing_${subcategoryIndex++}_${subcategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        categoryId: category.id,
        name: subcategoryName,
        emoji: null,
        description: `${subcategoryName} subcategory`,
        isDefault: false,
        isUserCreated: false,
        displayOrder: subcategoryIndex,
        createdBy: null
      });
    }
  });

// Generate summary
console.log('📊 SEED DATA SUMMARY');
console.log('─'.repeat(70));
console.log(`Inventory Domains: ${inventoryDomains.length}`);
console.log(`Business Categories: ${businessCategories.length}`);
console.log(`Inventory Subcategories: ${inventorySubcategories.length}`);
console.log('');

// Show breakdown by domain
console.log('🏢 BREAKDOWN BY DOMAIN');
console.log('─'.repeat(70));
inventoryDomains.forEach(domain => {
  const categories = businessCategories.filter(c => c.domainId === domain.id);
  const subcats = inventorySubcategories.filter(sc => {
    const cat = businessCategories.find(c => c.id === sc.categoryId);
    return cat && cat.domainId === domain.id;
  });

  console.log(`${domain.emoji} ${domain.name}`);
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Subcategories: ${subcats.length}`);

  // Show sample categories
  if (categories.length > 0) {
    categories.slice(0, 5).forEach(c => {
      const catSubcats = inventorySubcategories.filter(sc => sc.categoryId === c.id);
      console.log(`    - ${c.name} (${catSubcats.length} subcategories)`);
    });
    if (categories.length > 5) {
      console.log(`    ... and ${categories.length - 5} more categories`);
    }
  }
  console.log('');
});

// Save seed data files
const outputDir = path.join(__dirname, '..', 'seed-data', 'clothing-categories');

const domainsFile = path.join(outputDir, 'inventory-domains.json');
const categoriesFile = path.join(outputDir, 'business-categories.json');
const subcategoriesFile = path.join(outputDir, 'inventory-subcategories.json');

fs.writeFileSync(domainsFile, JSON.stringify(inventoryDomains, null, 2));
fs.writeFileSync(categoriesFile, JSON.stringify(businessCategories, null, 2));
fs.writeFileSync(subcategoriesFile, JSON.stringify(inventorySubcategories, null, 2));

console.log('📁 OUTPUT FILES');
console.log('─'.repeat(70));
console.log(`Inventory Domains saved to:`);
console.log(`  ${domainsFile}`);
console.log(`Business Categories saved to:`);
console.log(`  ${categoriesFile}`);
console.log(`Inventory Subcategories saved to:`);
console.log(`  ${subcategoriesFile}`);
console.log('');

// Generate combined seed file
const combinedSeedData = {
  inventoryDomains,
  businessCategories,
  inventorySubcategories,
  summary: {
    domains: inventoryDomains.length,
    categories: businessCategories.length,
    subcategories: inventorySubcategories.length,
    totalItems: final8Data.summary.totalItems
  }
};

const combinedFile = path.join(outputDir, 'complete-seed-data.json');
fs.writeFileSync(combinedFile, JSON.stringify(combinedSeedData, null, 2));

console.log(`Complete seed data saved to:`);
console.log(`  ${combinedFile}`);
console.log('');

console.log('✅ Seed data generation complete!');
console.log('');
console.log('Next step: Run the seeding script to populate the database');
console.log('  node scripts/seed-clothing-categories.js');
