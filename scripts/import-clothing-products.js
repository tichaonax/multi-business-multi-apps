const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Department to domain ID mapping
const DEPT_TO_DOMAIN = {
  'mens': 'domain_clothing_mens',
  'womens': 'domain_clothing_womens',
  'boys': 'domain_clothing_boys',
  'girls': 'domain_clothing_girls',
  'baby': 'domain_clothing_baby',
  'accessories': 'domain_clothing_accessories',
  'home-textiles': 'domain_clothing_home_textiles',
  'general-merch': 'domain_clothing_general_merch'
};

async function importClothingProducts() {
  console.log('=== CLOTHING PRODUCT IMPORT ===\n');

  try {
    // 1. Get clothing business
    const clothingBiz = await prisma.businesses.findFirst({
      where: { type: 'clothing' }
    });

    if (!clothingBiz) {
      throw new Error('No clothing business found. Please create one first.');
    }

    console.log(`📦 Importing products for: ${clothingBiz.name}`);
    console.log(`   Business ID: ${clothingBiz.id}\n`);

    // 2. Load product data
    const dataFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'final-8-departments.json');
    const productData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

    // 3. Load all clothing categories and subcategories
    console.log('🔍 Loading categories and subcategories from database...');

    const categories = await prisma.businessCategories.findMany({
      where: { businessType: 'clothing' },
      include: {
        inventory_subcategories: true,
        domain: true
      }
    });

    console.log(`   Found ${categories.length} categories\n`);

    // Build lookup maps
    const categoryMap = new Map(); // domain|categoryName -> category
    const subcategoryMap = new Map(); // categoryId|subcategoryName -> subcategory

    categories.forEach(cat => {
      const domainId = cat.domainId;
      const key = `${domainId}|${cat.name}`;
      categoryMap.set(key, cat);

      // Map subcategories
      cat.inventory_subcategories?.forEach(subcat => {
        const subKey = `${cat.id}|${subcat.name}`;
        subcategoryMap.set(subKey, subcat);
      });
    });

    console.log(`   Built category map: ${categoryMap.size} entries`);
    console.log(`   Built subcategory map: ${subcategoryMap.size} entries\n`);

    // 4. Import products
    console.log('📥 Importing products...\n');

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const errorLog = [];

    for (const [deptKey, dept] of Object.entries(productData.departments)) {
      const domainId = DEPT_TO_DOMAIN[deptKey];

      console.log(`\n📂 Processing ${dept.name} (${dept.count} items)...`);

      for (const item of dept.items) {
        try {
          // Check if product already exists
          const existing = await prisma.businessProducts.findFirst({
            where: {
              businessId: clothingBiz.id,
              sku: item.sku
            }
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Find matching category
          // First try domain-specific match
          const categoryKey = `${domainId}|${item.categoryName}`;
          let category = categoryMap.get(categoryKey);

          // If not found, try any match with same name (fallback)
          if (!category) {
            category = Array.from(categoryMap.values()).find(c => c.name === item.categoryName);
          }

          if (!category) {
            errors++;
            errorLog.push({
              sku: item.sku,
              product: item.product,
              error: `Category not found: ${item.categoryName} in any domain`
            });
            continue;
          }

          // Find matching subcategory (if provided)
          let subcategoryId = null;
          if (item.subcategory) {
            const subcategoryKey = `${category.id}|${item.subcategory}`;
            const subcategory = subcategoryMap.get(subcategoryKey);
            if (subcategory) {
              subcategoryId = subcategory.id;
            }
          }

          // Create product
          await prisma.businessProducts.create({
            data: {
              businessId: clothingBiz.id,
              name: item.product,
              sku: item.sku,
              categoryId: category.id,
              subcategoryId: subcategoryId,
              basePrice: 0.00, // Default price, can be updated later
              costPrice: null,
              businessType: 'clothing',
              isActive: true,
              isAvailable: false, // False since quantity is 0
              productType: 'PHYSICAL',
              condition: 'NEW',
              description: item.categoryName, // Use category as description
              updatedAt: new Date()
            }
          });

          imported++;

          // Progress indicator
          if ((imported + skipped + errors) % 100 === 0) {
            console.log(`  Progress: ${imported + skipped + errors}/${dept.count} (${imported} imported, ${skipped} skipped, ${errors} errors)`);
          }

        } catch (error) {
          errors++;
          errorLog.push({
            sku: item.sku,
            product: item.product,
            error: error.message
          });
        }
      }

      console.log(`  ✅ ${dept.name}: ${imported} imported, ${skipped} skipped, ${errors} errors`);
    }

    // 5. Summary
    console.log('\n\n📊 IMPORT SUMMARY');
    console.log('─'.repeat(70));
    console.log(`Total Products: ${productData.summary.totalItems}`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped (already exist): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('');

    if (errors > 0) {
      console.log('⚠️  ERRORS ENCOUNTERED');
      console.log('─'.repeat(70));
      errorLog.slice(0, 10).forEach(err => {
        console.log(`SKU: ${err.sku}`);
        console.log(`Product: ${err.product}`);
        console.log(`Error: ${err.error}`);
        console.log('---');
      });
      if (errorLog.length > 10) {
        console.log(`... and ${errorLog.length - 10} more errors\n`);
      }

      // Save full error log
      const errorFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'import-errors.json');
      fs.writeFileSync(errorFile, JSON.stringify(errorLog, null, 2));
      console.log(`\n📁 Full error log saved to: ${errorFile}\n`);
    }

    // 6. Verification
    console.log('🔍 VERIFICATION');
    console.log('─'.repeat(70));
    const totalProducts = await prisma.businessProducts.count({
      where: {
        businessId: clothingBiz.id,
        businessType: 'clothing'
      }
    });
    console.log(`Total clothing products in database: ${totalProducts}`);
    console.log('');

    if (imported > 0) {
      console.log('✅ Product import completed successfully!');
    } else if (skipped === productData.summary.totalItems) {
      console.log('✅ All products already imported (idempotent check passed)');
    }

    console.log('');
    console.log('📌 NEXT STEPS');
    console.log('─'.repeat(70));
    console.log('Products imported with quantity 0 and basePrice 0.00');
    console.log('Next tasks:');
    console.log('  1. Update product prices via admin UI');
    console.log('  2. Assign barcodes during receiving');
    console.log('  3. Add product images');
    console.log('  4. Stock products as they arrive');
    console.log('');

  } catch (error) {
    console.error('❌ Error during import:', error.message);
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run import
importClothingProducts()
  .then(() => {
    console.log('✅ Import process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import process failed:', error);
    process.exit(1);
  });
