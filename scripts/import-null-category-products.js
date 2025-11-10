const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Manual category mapping for null-category products
const MANUAL_CATEGORY_MAPPING = {
  // Beach items - use existing beach categories or "Beachwear"
  'Beach Shorts': 'Beach Shorts',
  'Beach Skirts': 'Beach Skirts',
  'Beach Trousers': 'Beach Trousers',
  'Beach Shirts': 'Beach Shirts',
  'Beachwear': 'Beachwear',

  // Clothing items
  'Quilts': 'Bedding',
  'Ladies Panties': 'Underwear',
  'Trousers For Boys': 'Pants',
  'Newborn Socks': 'Socks',
  'Fashion Skirts': 'Skirts',
  'Jag Inn For Ladies': 'Tops',
  'Work Suits For Kids': 'Suits',
  'Dress For Young Girls': 'Dresses',
  'Ladies Sandals': 'Sandals',
  'New Born Jeans': 'Jeans',

  // Non-clothing
  'Beauty': 'Uncategorized' // Should not be in clothing
};

// Department mapping based on product name
function inferDepartment(productName) {
  const name = productName.toLowerCase();

  if (name.includes('ladies') || name.includes('women')) return 'womens';
  if (name.includes('boys') || name.includes('boy')) return 'boys';
  if (name.includes('girls') || name.includes('girl')) return 'girls';
  if (name.includes('newborn') || name.includes('baby')) return 'baby';
  if (name.includes('kids') || name.includes('children')) return 'boys'; // Default kids to boys
  if (name.includes('beach')) return 'womens'; // Most beach items are women's

  return 'general-merch'; // Default
}

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

async function importNullCategoryProducts() {
  console.log('=== IMPORTING NULL-CATEGORY PRODUCTS ===\n');

  try {
    // 1. Get clothing business
    const clothingBiz = await prisma.businesses.findFirst({
      where: { type: 'clothing' }
    });

    if (!clothingBiz) {
      throw new Error('No clothing business found');
    }

    console.log(`📦 Business: ${clothingBiz.name} (${clothingBiz.id})\n`);

    // 2. Load error log (null category products)
    const errorFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'import-errors.json');
    const errors = JSON.parse(fs.readFileSync(errorFile, 'utf-8'));

    console.log(`📋 Found ${errors.length} products to import\n`);

    // 3. Load all categories
    const allCategories = await prisma.businessCategories.findMany({
      where: { businessType: 'clothing' }
    });

    // Build category lookup
    const categoryByName = new Map();
    allCategories.forEach(cat => {
      categoryByName.set(cat.name, cat);
    });

    console.log(`🔍 Available categories: ${allCategories.length}\n`);

    // 4. Create "Uncategorized" category if it doesn't exist
    let uncategorizedCategory = categoryByName.get('Uncategorized');

    if (!uncategorizedCategory) {
      console.log('📦 Creating "Uncategorized" category...');
      uncategorizedCategory = await prisma.businessCategories.create({
        data: {
          id: `category_uncategorized_${Date.now()}`,
          businessId: null,
          name: 'Uncategorized',
          description: 'Products pending categorization',
          parentId: null,
          displayOrder: 999,
          isActive: true,
          businessType: 'clothing',
          emoji: '📦',
          color: '#9CA3AF',
          domainId: DEPT_TO_DOMAIN['general-merch'],
          isUserCreated: false,
          createdBy: null,
          updatedAt: new Date()
        }
      });
      console.log(`  ✅ Created Uncategorized category\n`);
    } else {
      console.log('  ⏭️  Uncategorized category already exists\n');
    }

    // 5. Load product data to get full product details
    const dataFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'final-8-departments.json');
    const productData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

    // Build product lookup by SKU
    const productBySku = new Map();
    Object.values(productData.departments).forEach(dept => {
      dept.items.forEach(item => {
        productBySku.set(item.sku, item);
      });
    });

    // 6. Import each product
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    console.log('📥 Importing products...\n');

    for (const error of errors) {
      const sku = error.sku;
      const productInfo = productBySku.get(sku);

      if (!productInfo) {
        console.log(`⚠️  SKU ${sku} not found in source data`);
        failed++;
        continue;
      }

      // Check if already imported
      const existing = await prisma.businessProducts.findFirst({
        where: {
          businessId: clothingBiz.id,
          sku: sku
        }
      });

      if (existing) {
        console.log(`  ⏭️  Skipped: ${sku} (already exists)`);
        skipped++;
        continue;
      }

      // Infer category from product name
      let category = uncategorizedCategory;

      // Try to extract category from product name pattern
      const productNameParts = productInfo.product.split(':');
      if (productNameParts.length > 1) {
        const inferredCategory = productNameParts[0].trim();
        if (categoryByName.has(inferredCategory)) {
          category = categoryByName.get(inferredCategory);
        }
      }

      // Import product
      try {
        await prisma.businessProducts.create({
          data: {
            businessId: clothingBiz.id,
            name: productInfo.product,
            sku: productInfo.sku,
            categoryId: category.id,
            subcategoryId: null,
            basePrice: 0.00,
            costPrice: null,
            businessType: 'clothing',
            isActive: true,
            isAvailable: false,
            productType: 'PHYSICAL',
            condition: 'NEW',
            description: category.name,
            updatedAt: new Date()
          }
        });

        console.log(`  ✅ Imported: ${sku} → ${category.name}`);
        console.log(`      ${productInfo.product}`);
        imported++;
      } catch (err) {
        console.log(`  ❌ Failed: ${sku} - ${err.message}`);
        failed++;
      }
    }

    // 7. Summary
    console.log('\n\n📊 IMPORT SUMMARY');
    console.log('─'.repeat(70));
    console.log(`Total Products to Import: ${errors.length}`);
    console.log(`Successfully Imported: ${imported}`);
    console.log(`Skipped (already exist): ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log('');

    // 8. Final verification
    console.log('🔍 FINAL VERIFICATION');
    console.log('─'.repeat(70));
    const totalProducts = await prisma.businessProducts.count({
      where: {
        businessId: clothingBiz.id,
        businessType: 'clothing'
      }
    });
    console.log(`Total clothing products in database: ${totalProducts}`);
    console.log(`Expected: 1,067`);
    console.log(`Achievement: ${((totalProducts / 1067) * 100).toFixed(1)}%`);
    console.log('');

    if (totalProducts === 1067) {
      console.log('🎉 SUCCESS! All 1,067 products now imported!');
    } else if (totalProducts >= 1042) {
      console.log('✅ Import completed successfully!');
      console.log(`Remaining: ${1067 - totalProducts} products`);
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error during import:', error.message);
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importNullCategoryProducts()
  .then(() => {
    console.log('✅ Process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Process failed:', error);
    process.exit(1);
  });
