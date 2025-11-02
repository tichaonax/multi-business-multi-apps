const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAllDemoData() {
  try {
    console.log('\n🧹 Comprehensive Demo Data Cleanup\n');
    console.log('='.repeat(70));

    // 1. Check for any business-specific categories that shouldn't exist
    console.log('\n📋 Step 1: Checking for business-specific categories...\n');
    
    const businessSpecificCats = await prisma.businessCategories.findMany({
      where: {
        businessId: { not: null },
        isUserCreated: false  // System categories should have NULL businessId
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

    if (businessSpecificCats.length > 0) {
      console.log(`⚠️  Found ${businessSpecificCats.length} system categories with businessId (should be NULL):\n`);
      
      for (const cat of businessSpecificCats) {
        console.log(`  ${cat.emoji || '📦'} ${cat.name} (${cat.businessType})`);
        console.log(`    ID: ${cat.id}`);
        console.log(`    BusinessId: ${cat.businessId}`);
        console.log(`    Products: ${cat._count.business_products}`);
        console.log(`    Subcategories: ${cat._count.inventory_subcategories}`);
        console.log('');
      }

      // Check if we can find type-based equivalents
      console.log('🔄 Looking for type-based equivalents...\n');
      
      for (const oldCat of businessSpecificCats) {
        const typeCat = await prisma.businessCategories.findFirst({
          where: {
            businessType: oldCat.businessType,
            name: oldCat.name,
            businessId: null
          }
        });

        if (typeCat) {
          console.log(`✅ Found type-based "${oldCat.name}" (${typeCat.id})`);
          
          if (oldCat._count.business_products > 0) {
            console.log(`   Migrating ${oldCat._count.business_products} products...`);
            
            await prisma.businessProducts.updateMany({
              where: { categoryId: oldCat.id },
              data: { 
                categoryId: typeCat.id,
                subcategoryId: null  // Clear subcategory as they may not match
              }
            });
            
            console.log(`   ✅ Migrated products from ${oldCat.id} to ${typeCat.id}`);
          }
          
          // Delete the old category
          try {
            await prisma.businessCategories.delete({
              where: { id: oldCat.id }
            });
            console.log(`   ✅ Deleted old category: ${oldCat.id}\n`);
          } catch (error) {
            console.log(`   ❌ Could not delete ${oldCat.id}: ${error.message}\n`);
          }
        } else {
          console.log(`⚠️  No type-based equivalent found for "${oldCat.name}" (${oldCat.businessType})`);
          console.log(`   This category will remain as business-specific\n`);
        }
      }
    } else {
      console.log('✅ No business-specific system categories found\n');
    }

    // 2. Check for orphaned subcategories (where categoryId doesn't exist)
    console.log('\n📋 Step 2: Checking for orphaned subcategories...\n');
    
    const allSubs = await prisma.inventorySubcategories.findMany({
      include: {
        category: true
      }
    });
    
    const orphanedSubs = allSubs.filter(sub => !sub.category);

    if (orphanedSubs.length > 0) {
      console.log(`⚠️  Found ${orphanedSubs.length} orphaned subcategories:\n`);
      orphanedSubs.forEach(sub => {
        console.log(`  - ${sub.name} (categoryId: ${sub.categoryId})`);
      });
      
      console.log('\n🗑️  Deleting orphaned subcategories...');
      await prisma.inventorySubcategories.deleteMany({
        where: {
          id: { in: orphanedSubs.map(s => s.id) }
        }
      });
      console.log(`✅ Deleted ${orphanedSubs.length} orphaned subcategories\n`);
    } else {
      console.log('✅ No orphaned subcategories found\n');
    }

    // 3. Check for products with invalid categoryId
    console.log('\n📋 Step 3: Checking for products with invalid categories...\n');
    
    const allProducts = await prisma.businessProducts.findMany({
      select: {
        id: true,
        name: true,
        categoryId: true,
        subcategoryId: true,
        business_categories: true
      }
    });

    const invalidProducts = allProducts.filter(p => !p.business_categories);
    
    if (invalidProducts.length > 0) {
      console.log(`⚠️  Found ${invalidProducts.length} products with invalid categoryId:\n`);
      invalidProducts.forEach(p => {
        console.log(`  - ${p.name} (categoryId: ${p.categoryId})`);
      });
      console.log('\n⚠️  These products need manual review\n');
    } else {
      console.log('✅ All products have valid categories\n');
    }

    // 4. Check for products with invalid subcategoryId
    console.log('\n📋 Step 4: Checking for products with invalid subcategories...\n');
    
    const productsWithSub = await prisma.businessProducts.findMany({
      where: {
        subcategoryId: { not: null }
      },
      include: {
        inventory_subcategory: true,
        business_categories: true
      }
    });

    const invalidSubs = productsWithSub.filter(p => !p.inventory_subcategory);
    
    if (invalidSubs.length > 0) {
      console.log(`⚠️  Found ${invalidSubs.length} products with invalid subcategoryId:\n`);
      
      for (const p of invalidSubs) {
        console.log(`  - ${p.name}`);
        console.log(`    Category: ${p.business_categories?.name}`);
        console.log(`    Invalid SubcategoryId: ${p.subcategoryId}`);
      }
      
      console.log('\n🔧 Clearing invalid subcategoryId values...');
      await prisma.businessProducts.updateMany({
        where: {
          id: { in: invalidSubs.map(p => p.id) }
        },
        data: {
          subcategoryId: null
        }
      });
      console.log(`✅ Cleared ${invalidSubs.length} invalid subcategory references\n`);
    } else {
      console.log('✅ All subcategory references are valid\n');
    }

    // 5. Verify category-subcategory relationships
    console.log('\n📋 Step 5: Verifying category-subcategory relationships...\n');
    
    const productsWithValidSub = productsWithSub.filter(p => p.inventory_subcategory);
    let mismatchCount = 0;
    
    for (const p of productsWithValidSub) {
      if (p.inventory_subcategory.categoryId !== p.categoryId) {
        console.log(`⚠️  Mismatch: ${p.name}`);
        console.log(`    Product categoryId: ${p.categoryId}`);
        console.log(`    Subcategory's categoryId: ${p.inventory_subcategory.categoryId}`);
        console.log(`    Fixing...`);
        
        // Clear the subcategory since it doesn't match
        await prisma.businessProducts.update({
          where: { id: p.id },
          data: { subcategoryId: null }
        });
        
        mismatchCount++;
      }
    }
    
    if (mismatchCount > 0) {
      console.log(`\n✅ Fixed ${mismatchCount} category-subcategory mismatches\n`);
    } else {
      console.log('✅ All category-subcategory relationships are correct\n');
    }

    // 6. Final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(70) + '\n');

    const categorySummary = await prisma.businessCategories.groupBy({
      by: ['businessType', 'isUserCreated'],
      where: {
        businessId: null
      },
      _count: { id: true }
    });

    console.log('Type-based Categories (businessId = NULL):');
    categorySummary.forEach(s => {
      const type = s.isUserCreated ? 'User-Created' : 'System';
      console.log(`  ${s.businessType}: ${s._count.id} ${type} categories`);
    });

    const businessSpecificCount = await prisma.businessCategories.count({
      where: { businessId: { not: null } }
    });
    console.log(`\nBusiness-specific Categories: ${businessSpecificCount}`);

    const totalProducts = await prisma.businessProducts.count();
    
    const allProds = await prisma.businessProducts.findMany({
      select: {
        id: true,
        subcategoryId: true,
        business_categories: { select: { id: true } },
        inventory_subcategory: { select: { id: true } }
      }
    });
    
    const productsWithCategories = allProds.filter(p => p.business_categories).length;
    const productsWithSubcategories = allProds.filter(p => p.subcategoryId && p.inventory_subcategory).length;

    console.log(`\nProducts:`);
    console.log(`  Total: ${totalProducts}`);
    console.log(`  With valid categories: ${productsWithCategories}`);
    console.log(`  With valid subcategories: ${productsWithSubcategories}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ CLEANUP COMPLETE!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAllDemoData();
