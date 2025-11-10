const fs = require('fs');
const path = require('path');

// Read the analysis data
const analysisFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'raw-data-analysis.json');
const final8File = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'final-8-departments.json');

const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf-8'));
const final8Data = JSON.parse(fs.readFileSync(final8File, 'utf-8'));

// Analyze SKU patterns
function analyzeSKUPattern(sku) {
  // Pattern: ABC-123 or ABC-1234
  const match = sku.match(/^([A-Z]{3})-(\d+)$/);
  if (match) {
    return {
      prefix: match[1],
      number: parseInt(match[2]),
      digits: match[2].length
    };
  }
  return null;
}

// Generate new SKU
function generateNewSKU(baseSKU, existingSKUs, attempt = 1) {
  const pattern = analyzeSKUPattern(baseSKU);
  if (!pattern) {
    // Fallback: append suffix
    const newSKU = `${baseSKU}-${attempt}`;
    return existingSKUs.has(newSKU) ? generateNewSKU(baseSKU, existingSKUs, attempt + 1) : newSKU;
  }

  // Try incrementing the number
  const newNumber = pattern.number + attempt;
  const newSKU = `${pattern.prefix}-${String(newNumber).padStart(pattern.digits, '0')}`;

  if (existingSKUs.has(newSKU)) {
    return generateNewSKU(baseSKU, existingSKUs, attempt + 1);
  }

  return newSKU;
}

// Process duplicates
console.log('=== SKU DUPLICATE RESOLUTION ===\n');

const duplicates = analysis.duplicateSkus;
console.log(`Found ${duplicates.length} duplicate SKUs to fix\n`);

// Build set of all existing SKUs
const allExistingSKUs = new Set(analysis.allItems.map(item => item.sku));

// SKU mapping: old SKU → new SKU
const skuMapping = {};
const fixedItems = [];

duplicates.forEach(({ sku, occurrences }) => {
  console.log(`\n📦 Fixing SKU: ${sku} (${occurrences.length} occurrences)`);

  occurrences.forEach((occurrence, index) => {
    if (index === 0) {
      // Keep first occurrence with original SKU
      console.log(`  ✓ Kept: ${occurrence.product} → ${sku} (original)`);
      skuMapping[sku] = {
        original: true,
        newSKU: sku,
        product: occurrence.product,
        category: occurrence.category
      };
    } else {
      // Generate new SKU for duplicates
      const newSKU = generateNewSKU(sku, allExistingSKUs);
      allExistingSKUs.add(newSKU); // Add to set to avoid future collisions

      console.log(`  → Fixed: ${occurrence.product}`);
      console.log(`     Old SKU: ${sku}`);
      console.log(`     New SKU: ${newSKU}`);

      // Store mapping with unique key
      const mappingKey = `${sku}_${index}`;
      skuMapping[mappingKey] = {
        original: false,
        oldSKU: sku,
        newSKU: newSKU,
        product: occurrence.product,
        category: occurrence.category,
        occurrenceIndex: index
      };

      fixedItems.push({
        product: occurrence.product,
        oldSKU: sku,
        newSKU: newSKU,
        category: occurrence.category
      });
    }
  });
});

console.log('\n\n📊 SUMMARY');
console.log('─'.repeat(70));
console.log(`Total Duplicate SKUs: ${duplicates.length}`);
console.log(`Total Items Fixed: ${fixedItems.length}`);
console.log(`New Unique SKUs Generated: ${fixedItems.length}`);
console.log('');

// Update final-8-departments.json with new SKUs
console.log('🔄 Updating product SKUs in final-8-departments.json...\n');

let updatedCount = 0;

Object.keys(final8Data.departments).forEach(deptKey => {
  const dept = final8Data.departments[deptKey];

  dept.items.forEach(item => {
    // Check if this item needs SKU update
    const fixedItem = fixedItems.find(f =>
      f.product === item.product && f.oldSKU === item.sku
    );

    if (fixedItem) {
      console.log(`  Updated: ${item.product}`);
      console.log(`    ${item.sku} → ${fixedItem.newSKU}`);
      item.sku = fixedItem.newSKU;
      updatedCount++;
    }
  });
});

console.log(`\n✅ Updated ${updatedCount} items with new SKUs\n`);

// Save updated final-8-departments.json
fs.writeFileSync(final8File, JSON.stringify(final8Data, null, 2));
console.log(`✅ Updated file saved: ${final8File}\n`);

// Save SKU mapping
const mappingOutput = {
  summary: {
    totalDuplicates: duplicates.length,
    itemsFixed: fixedItems.length,
    newSKUsGenerated: fixedItems.length
  },
  duplicateDetails: duplicates.map(({ sku, occurrences }) => ({
    originalSKU: sku,
    occurrenceCount: occurrences.length,
    occurrences: occurrences.map((occ, idx) => ({
      index: idx,
      product: occ.product,
      category: occ.category,
      keptOriginal: idx === 0,
      newSKU: idx === 0 ? sku : fixedItems.find(f => f.product === occ.product && f.oldSKU === sku)?.newSKU
    }))
  })),
  fixedItems
};

const mappingFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'sku-fixes.json');
fs.writeFileSync(mappingFile, JSON.stringify(mappingOutput, null, 2));

console.log('📁 OUTPUT FILES');
console.log('─'.repeat(70));
console.log(`SKU mapping saved to:`);
console.log(`  ${mappingFile}`);
console.log(`Updated product data:`);
console.log(`  ${final8File}`);
console.log('');

// Verify no duplicates remain
const allSKUsAfter = new Set();
const stillDuplicates = [];

Object.keys(final8Data.departments).forEach(deptKey => {
  final8Data.departments[deptKey].items.forEach(item => {
    if (allSKUsAfter.has(item.sku)) {
      stillDuplicates.push(item.sku);
    }
    allSKUsAfter.add(item.sku);
  });
});

console.log('✅ VERIFICATION');
console.log('─'.repeat(70));
console.log(`Total unique SKUs after fix: ${allSKUsAfter.size}`);
console.log(`Expected unique SKUs: ${analysis.allItems.length}`);
console.log(`Remaining duplicates: ${stillDuplicates.length}`);

if (stillDuplicates.length === 0) {
  console.log('\n🎉 SUCCESS! All SKU duplicates resolved!');
} else {
  console.log('\n⚠️  WARNING: Some duplicates still remain:');
  stillDuplicates.forEach(sku => console.log(`  - ${sku}`));
}
console.log('');
