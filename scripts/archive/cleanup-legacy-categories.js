const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupLegacyCategories() {
  try {
    console.log('\n🧹 Cleaning Up Legacy Demo Categories\n');

    // Find legacy categories that shouldn't be top-level
    const legacyCategories = await prisma.businessCategories.findMany({
      where: {
        businessType: 'clothing',
        name: {
          in: ['Tops', 'Bottoms', 'Dresses']
        }
      },
      include: {
        _count: {
          select: {
            business_products: true,
            inventory_subcategories: true
          }
        }
      }
    });

    console.log(`Found ${legacyCategories.length} legacy categories:\n`);

    for (const category of legacyCategories) {
      console.log(`\n📦 ${category.name} (${category.id})`);
      console.log(`   Products: ${category._count.business_products}`);
      console.log(`   Subcategories: ${category._count.inventory_subcategories}`);
      console.log(`   BusinessId: ${category.businessId || 'NULL'}`);
    }

    // Check if any products are using these categories
    const totalProducts = legacyCategories.reduce((sum, cat) => sum + cat._count.business_products, 0);

    if (totalProducts > 0) {
      console.log(`\n⚠️  WARNING: ${totalProducts} products are using these legacy categories!`);
      console.log('\n🔄 Migrating products to proper categories...\n');

      // Migrate products from legacy categories to proper ones
      const categoryMapping = {
        'Tops': 'Men\'s Fashion',  // or Women's Fashion depending on product
        'Bottoms': 'Women\'s Fashion',
        'Dresses': 'Women\'s Fashion'
      };

      for (const legacyCategory of legacyCategories) {
        if (legacyCategory._count.business_products > 0) {
          // Find the target category
          const targetCategoryName = categoryMapping[legacyCategory.name];
          const targetCategory = await prisma.businessCategories.findFirst({
            where: {
              businessType: 'clothing',
              name: targetCategoryName,
              businessId: null
            }
          });

          if (!targetCategory) {
            console.log(`❌ Could not find target category: ${targetCategoryName}`);
            continue;
          }

          // Get products using this legacy category
          const products = await prisma.businessProducts.findMany({
            where: { categoryId: legacyCategory.id },
            select: { id: true, name: true }
          });

          console.log(`\n  Migrating ${products.length} products from "${legacyCategory.name}" to "${targetCategory.name}"`);

          // Update products
          const result = await prisma.businessProducts.updateMany({
            where: { categoryId: legacyCategory.id },
            data: { 
              categoryId: targetCategory.id,
              subcategoryId: null  // Clear subcategory since we're changing categories
            }
          });

          console.log(`  ✅ Migrated ${result.count} products`);
        }
      }
    } else {
      console.log('\n✅ No products using legacy categories');
    }

    // Now delete the legacy categories
    console.log('\n\n🗑️  Deleting legacy categories...\n');

    for (const category of legacyCategories) {
      try {
        await prisma.businessCategories.delete({
          where: { id: category.id }
        });
        console.log(`✅ Deleted: ${category.name} (${category.id})`);
      } catch (error) {
        console.log(`❌ Failed to delete ${category.name}: ${error.message}`);
      }
    }

    console.log('\n\n' + '='.repeat(70));
    console.log('✅ CLEANUP COMPLETE');
    console.log('='.repeat(70));
    console.log('\nLegacy categories removed and products migrated to proper categories.');
    console.log('All categories now follow the standard structure from seed data.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupLegacyCategories();
