const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function seedClothingCategories() {
  console.log('=== CLOTHING CATEGORY SEEDING ===\n');

  try {
    // Load seed data
    const seedDataFile = path.join(__dirname, '..', 'seed-data', 'clothing-categories', 'complete-seed-data.json');
    const seedData = JSON.parse(fs.readFileSync(seedDataFile, 'utf-8'));

    console.log('📦 Loaded seed data:');
    console.log(`  - ${seedData.inventoryDomains.length} domains`);
    console.log(`  - ${seedData.businessCategories.length} categories`);
    console.log(`  - ${seedData.inventorySubcategories.length} subcategories`);
    console.log('');

    // ========================================
    // 1. Seed Inventory Domains
    // ========================================
    console.log('🏢 Seeding Inventory Domains...');

    let domainsCreated = 0;
    let domainsSkipped = 0;

    for (const domain of seedData.inventoryDomains) {
      // Check by both ID and name
      const existingById = await prisma.inventoryDomains.findUnique({
        where: { id: domain.id }
      });

      const existingByName = await prisma.inventoryDomains.findUnique({
        where: { name: domain.name }
      });

      if (existingById || existingByName) {
        console.log(`  ⏭️  Skipped: ${domain.emoji} ${domain.name} (already exists)`);
        domainsSkipped++;
      } else {
        await prisma.inventoryDomains.create({
          data: domain
        });
        console.log(`  ✅ Created: ${domain.emoji} ${domain.name}`);
        domainsCreated++;
      }
    }

    console.log(`\n  Summary: ${domainsCreated} created, ${domainsSkipped} skipped\n`);

    // ========================================
    // 1.5 Build domain ID mapping
    // ========================================
    console.log('🔗 Building domain ID mapping...');
    const actualDomains = await prisma.inventoryDomains.findMany({
      where: { businessType: 'clothing' }
    });

    const domainIdMap = new Map();
    seedData.inventoryDomains.forEach(seedDomain => {
      // Find matching actual domain by ID or name
      const match = actualDomains.find(d => d.id === seedDomain.id || d.name === seedDomain.name);
      if (match) {
        domainIdMap.set(seedDomain.id, match.id);
        console.log(`  ${seedDomain.emoji} ${seedDomain.name} → ${match.id}`);
      }
    });
    console.log('');

    // ========================================
    // 2. Seed Business Categories
    // ========================================
    console.log('📋 Seeding Business Categories...');

    let categoriesCreated = 0;
    let categoriesSkipped = 0;

    for (const category of seedData.businessCategories) {
      // Check by both ID and (businessType, name)
      const existingById = await prisma.businessCategories.findUnique({
        where: { id: category.id }
      });

      const existingByName = await prisma.businessCategories.findFirst({
        where: {
          businessType: category.businessType,
          name: category.name
        }
      });

      if (existingById || existingByName) {
        categoriesSkipped++;
      } else {
        // Map domain ID to actual ID
        const actualDomainId = domainIdMap.get(category.domainId);
        if (!actualDomainId) {
          console.log(`  ⚠️  Skipped category "${category.name}": domain ${category.domainId} not found`);
          categoriesSkipped++;
          continue;
        }

        await prisma.businessCategories.create({
          data: {
            ...category,
            domainId: actualDomainId,
            updatedAt: new Date()
          }
        });
        categoriesCreated++;
      }

      // Progress indicator every 50 categories
      if ((categoriesCreated + categoriesSkipped) % 50 === 0) {
        console.log(`  Progress: ${categoriesCreated + categoriesSkipped}/${seedData.businessCategories.length}`);
      }
    }

    console.log(`  ✅ Completed: ${categoriesCreated} created, ${categoriesSkipped} skipped\n`);

    // ========================================
    // 2.5 Build category ID mapping
    // ========================================
    console.log('🔗 Building category ID mapping...');
    const actualCategories = await prisma.businessCategories.findMany({
      where: { businessType: 'clothing' }
    });

    const categoryIdMap = new Map();
    seedData.businessCategories.forEach(seedCategory => {
      // Find matching actual category by ID or (businessType, name)
      const match = actualCategories.find(c =>
        c.id === seedCategory.id ||
        (c.businessType === seedCategory.businessType && c.name === seedCategory.name)
      );
      if (match) {
        categoryIdMap.set(seedCategory.id, match.id);
      }
    });
    console.log(`  Mapped ${categoryIdMap.size} categories\n`);

    // ========================================
    // 3. Seed Inventory Subcategories
    // ========================================
    console.log('📂 Seeding Inventory Subcategories...');

    let subcategoriesCreated = 0;
    let subcategoriesSkipped = 0;

    for (const subcategory of seedData.inventorySubcategories) {
      const existing = await prisma.inventorySubcategories.findUnique({
        where: { id: subcategory.id }
      });

      if (existing) {
        subcategoriesSkipped++;
      } else {
        // Map category ID to actual ID
        const actualCategoryId = categoryIdMap.get(subcategory.categoryId);
        if (!actualCategoryId) {
          console.log(`  ⚠️  Skipped subcategory "${subcategory.name}": category ${subcategory.categoryId} not found`);
          subcategoriesSkipped++;
          continue;
        }

        await prisma.inventorySubcategories.create({
          data: {
            ...subcategory,
            categoryId: actualCategoryId
          }
        });
        subcategoriesCreated++;
      }

      // Progress indicator every 50 subcategories
      if ((subcategoriesCreated + subcategoriesSkipped) % 50 === 0) {
        console.log(`  Progress: ${subcategoriesCreated + subcategoriesSkipped}/${seedData.inventorySubcategories.length}`);
      }
    }

    console.log(`  ✅ Completed: ${subcategoriesCreated} created, ${subcategoriesSkipped} skipped\n`);

    // ========================================
    // Summary
    // ========================================
    console.log('📊 SEEDING SUMMARY');
    console.log('─'.repeat(70));
    console.log(`Inventory Domains:`);
    console.log(`  Created: ${domainsCreated}`);
    console.log(`  Skipped: ${domainsSkipped}`);
    console.log(`  Total: ${domainsCreated + domainsSkipped}`);
    console.log('');
    console.log(`Business Categories:`);
    console.log(`  Created: ${categoriesCreated}`);
    console.log(`  Skipped: ${categoriesSkipped}`);
    console.log(`  Total: ${categoriesCreated + categoriesSkipped}`);
    console.log('');
    console.log(`Inventory Subcategories:`);
    console.log(`  Created: ${subcategoriesCreated}`);
    console.log(`  Skipped: ${subcategoriesSkipped}`);
    console.log(`  Total: ${subcategoriesCreated + subcategoriesSkipped}`);
    console.log('');

    // Verification
    console.log('🔍 VERIFICATION');
    console.log('─'.repeat(70));

    const domainCount = await prisma.inventoryDomains.count({
      where: { businessType: 'clothing' }
    });
    const categoryCount = await prisma.businessCategories.count({
      where: { businessType: 'clothing' }
    });
    const subcategoryCount = await prisma.inventorySubcategories.count();

    console.log(`Clothing Domains in database: ${domainCount}`);
    console.log(`Clothing Categories in database: ${categoryCount}`);
    console.log(`Inventory Subcategories in database: ${subcategoryCount}`);
    console.log('');

    if (domainsCreated + categoriesCreated + subcategoriesCreated === 0) {
      console.log('✅ All clothing categories already seeded (idempotent check passed)');
    } else {
      console.log('✅ Clothing categories seeding completed successfully!');
    }

    console.log('');
    console.log('📌 NEXT STEPS');
    console.log('─'.repeat(70));
    console.log('The 8 clothing departments are now ready in the database:');
    seedData.inventoryDomains.forEach(d => {
      console.log(`  ${d.emoji} ${d.name}`);
    });
    console.log('');
    console.log('Ready for Phase 5: Bulk Product Registration System');
    console.log('');

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
seedClothingCategories()
  .then(() => {
    console.log('✅ Seeding process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding process failed:', error);
    process.exit(1);
  });
