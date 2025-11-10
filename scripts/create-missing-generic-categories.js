const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define generic categories to create
const GENERIC_CATEGORIES = [
  // Women's domain categories
  {
    domain: 'domain_clothing_womens',
    categories: [
      { name: 'Accessories', description: 'General accessories for women' },
      { name: 'Footwear', description: 'General footwear for women' },
      { name: 'Tops', description: 'General tops and shirts for women' },
      { name: 'Dresses', description: 'General dresses for women' },
      { name: 'Shorts', description: 'Shorts for women' },
      { name: 'Shoes', description: 'Shoes for women' },
      { name: 'Sandals', description: 'Sandals for women' },
      { name: 'Jackets', description: 'Jackets and outerwear for women' },
      { name: 'Pants', description: 'Pants and trousers for women' },
      { name: 'Jumpsuit', description: 'Jumpsuits and rompers for women' }
    ]
  },
  // Men's domain categories
  {
    domain: 'domain_clothing_mens',
    categories: [
      { name: 'Accessories', description: 'General accessories for men' },
      { name: 'Tops', description: 'General tops and shirts for men' },
      { name: 'Shorts', description: 'Shorts for men' },
      { name: 'Shoes', description: 'Shoes for men' },
      { name: 'Sandals', description: 'Sandals for men' },
      { name: 'Jackets', description: 'Jackets and outerwear for men' },
      { name: 'Pants', description: 'Pants and trousers for men' },
      { name: 'Jeans', description: 'Jeans for men' },
      { name: 'Graphic Tees', description: 'Graphic t-shirts for men' },
      { name: 'T-Shirt', description: 'T-shirts for men' }
    ]
  },
  // Boys domain categories
  {
    domain: 'domain_clothing_boys',
    categories: [
      { name: 'Tops', description: 'Tops and shirts for boys' },
      { name: 'Shorts', description: 'Shorts for boys' },
      { name: 'Shoes', description: 'Shoes for boys' },
      { name: 'Sandals', description: 'Sandals for boys' },
      { name: 'Jackets', description: 'Jackets and outerwear for boys' },
      { name: 'Pants', description: 'Pants for boys' },
      { name: 'Graphic Tees', description: 'Graphic t-shirts for boys' },
      { name: 'Pajamas', description: 'Pajamas and sleepwear for boys' },
      { name: 'Underwear', description: 'Underwear for boys' },
      { name: 'Swim', description: 'Swimwear for boys' },
      { name: 'T-Shirt', description: 'T-shirts for boys' },
      { name: 'Socks', description: 'Socks for boys' }
    ]
  },
  // Girls domain categories
  {
    domain: 'domain_clothing_girls',
    categories: [
      { name: 'Tops', description: 'Tops and shirts for girls' },
      { name: 'Shorts', description: 'Shorts for girls' },
      { name: 'Dresses', description: 'Dresses for girls' },
      { name: 'Shoes', description: 'Shoes for girls' },
      { name: 'Sandals', description: 'Sandals for girls' },
      { name: 'Jackets', description: 'Jackets and outerwear for girls' },
      { name: 'Pants', description: 'Pants for girls' },
      { name: 'Leggings', description: 'Leggings for girls' },
      { name: 'Skirts', description: 'Skirts for girls' },
      { name: 'Graphic Tees', description: 'Graphic t-shirts for girls' },
      { name: 'Pajamas', description: 'Pajamas and sleepwear for girls' },
      { name: 'Underwear', description: 'Underwear for girls' },
      { name: 'Cap', description: 'Hats and caps for girls' },
      { name: 'T-Shirt', description: 'T-shirts for girls' },
      { name: 'Socks', description: 'Socks for girls' }
    ]
  },
  // Baby domain categories
  {
    domain: 'domain_clothing_baby',
    categories: [
      { name: 'Accessories', description: 'Accessories for babies' },
      { name: 'Jackets', description: 'Jackets and outerwear for babies' },
      { name: 'Cap', description: 'Hats and caps for babies' }
    ]
  },
  // Home & Textiles domain
  {
    domain: 'domain_clothing_home_textiles',
    categories: [
      { name: 'Towels', description: 'Bath and beach towels' },
      { name: 'Beach Towels', description: 'Beach towels' },
      { name: 'Ribbon Towels', description: 'Decorative ribbon towels' }
    ]
  },
  // General Merchandise domain
  {
    domain: 'domain_clothing_general_merch',
    categories: [
      { name: 'Bags', description: 'General bags and carriers' },
      { name: 'Jeans', description: 'Miscellaneous jeans' },
      { name: 'Socks', description: 'Miscellaneous socks' }
    ]
  }
];

async function createMissingCategories() {
  console.log('=== CREATING MISSING GENERIC CATEGORIES ===\n');

  try {
    let created = 0;
    let skipped = 0;

    for (const domainGroup of GENERIC_CATEGORIES) {
      const domain = await prisma.inventoryDomains.findUnique({
        where: { id: domainGroup.domain }
      });

      if (!domain) {
        console.log(`⚠️  Domain not found: ${domainGroup.domain}`);
        continue;
      }

      console.log(`\n📂 ${domain.emoji} ${domain.name} (${domain.id})`);

      for (const catData of domainGroup.categories) {
        // Check if category already exists (by businessType and name only)
        // Note: Unique constraint is on (businessType, name), not domain-specific
        const existing = await prisma.businessCategories.findFirst({
          where: {
            businessType: 'clothing',
            name: catData.name
          }
        });

        if (existing) {
          console.log(`  ⏭️  Skipped: ${catData.name} (already exists in ${existing.domainId || 'unknown domain'})`);
          skipped++;
          continue;
        }

        // Create category
        const category = await prisma.businessCategories.create({
          data: {
            id: `category_generic_${domain.id}_${catData.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
            businessId: null, // System template
            name: catData.name,
            description: catData.description,
            parentId: null,
            displayOrder: 0,
            isActive: true,
            businessType: 'clothing',
            emoji: '📦', // Generic emoji
            color: '#6B7280', // Gray color
            domainId: domain.id,
            isUserCreated: false,
            createdBy: null,
            updatedAt: new Date()
          }
        });

        console.log(`  ✅ Created: ${catData.name}`);
        created++;
      }
    }

    console.log('\n\n📊 SUMMARY');
    console.log('─'.repeat(70));
    console.log(`Categories Created: ${created}`);
    console.log(`Categories Skipped: ${skipped}`);
    console.log(`Total: ${created + skipped}`);
    console.log('');

    // Verification
    console.log('🔍 VERIFICATION');
    console.log('─'.repeat(70));
    const totalCategories = await prisma.businessCategories.count({
      where: { businessType: 'clothing' }
    });
    console.log(`Total clothing categories in database: ${totalCategories}`);
    console.log('');

    console.log('✅ Missing generic categories created successfully!');
    console.log('');
    console.log('📌 NEXT STEP');
    console.log('─'.repeat(70));
    console.log('Re-run product import to import the remaining 353 products:');
    console.log('  node scripts/import-clothing-products.js');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating categories:', error.message);
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createMissingCategories()
  .then(() => {
    console.log('✅ Process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Process failed:', error);
    process.exit(1);
  });
