const fs = require('fs');
const path = require('path');

/**
 * Fix duplicate category names in clothing seed data
 *
 * Problem: Multiple categories have the same name (e.g., "Accessories")
 * within the same businessType, violating the unique constraint on (businessType, name)
 *
 * Solution: Append domain name to category names to make them unique
 */

const seedDataDir = path.join(__dirname, '../seed-data/clothing-categories');
const businessCategoriesFile = path.join(seedDataDir, 'business-categories.json');

// Read the business categories
const categories = JSON.parse(fs.readFileSync(businessCategoriesFile, 'utf8'));

// Domain ID to friendly name mapping
const domainNames = {
  'domain_clothing_mens': "Men's",
  'domain_clothing_womens': "Women's",
  'domain_clothing_boys': "Boys",
  'domain_clothing_girls': "Girls",
  'domain_clothing_baby': "Baby",
  'domain_clothing_accessories': 'Accessories',
  'domain_clothing_home': 'Home',
  'domain_clothing_general': 'General'
};

// Track which names appear multiple times for the same businessType
const nameCount = {};
categories.forEach(cat => {
  const key = `${cat.businessType}:${cat.name}`;
  nameCount[key] = (nameCount[key] || 0) + 1;
});

// Find duplicates
const duplicates = Object.entries(nameCount)
  .filter(([_, count]) => count > 1)
  .map(([key]) => key.split(':')[1]);

console.log('Found duplicate category names:', duplicates);
console.log(`Total duplicates: ${duplicates.length}`);

// Fix duplicates by appending domain name
let fixedCount = 0;
categories.forEach(cat => {
  if (duplicates.includes(cat.name) && cat.domainId) {
    const domainName = domainNames[cat.domainId] || cat.domainId;
    const oldName = cat.name;

    // Only append if not already appended
    if (!cat.name.includes(domainName)) {
      cat.name = `${cat.name} (${domainName})`;
      console.log(`Fixed: "${oldName}" -> "${cat.name}" [${cat.id}]`);
      fixedCount++;
    }
  }
});

console.log(`\nFixed ${fixedCount} category names`);

// Write back
fs.writeFileSync(businessCategoriesFile, JSON.stringify(categories, null, 2));
console.log(`\nUpdated ${businessCategoriesFile}`);

// Also update complete-seed-data.json if it exists
const completeSeedFile = path.join(seedDataDir, 'complete-seed-data.json');
if (fs.existsSync(completeSeedFile)) {
  const completeSeed = JSON.parse(fs.readFileSync(completeSeedFile, 'utf8'));
  if (completeSeed.businessCategories) {
    completeSeed.businessCategories = categories;
    fs.writeFileSync(completeSeedFile, JSON.stringify(completeSeed, null, 2));
    console.log(`Updated ${completeSeedFile}`);
  }
}
