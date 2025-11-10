const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClothingCategories() {
  console.log('=== CLOTHING CATEGORIES ===\n');

  const domains = await prisma.inventoryDomains.findMany({
    where: { businessType: 'clothing' },
    include: {
      business_categories: {
        where: { parentId: null },
        include: {
          inventory_subcategories: true,
          other_business_categories: true
        }
      }
    }
  });

  console.log(`Found ${domains.length} clothing domains\n`);

  for (const domain of domains) {
    console.log(`${domain.emoji} ${domain.name} (ID: ${domain.id})`);
    console.log(`  Categories: ${domain.business_categories.length}`);

    domain.business_categories.forEach(cat => {
      console.log(`    ${cat.emoji} ${cat.name}`);
      if (cat.inventory_subcategories.length > 0) {
        console.log(`      Subcategories: ${cat.inventory_subcategories.length}`);
        cat.inventory_subcategories.slice(0, 3).forEach(sub => {
          const emoji = sub.emoji || '•';
          console.log(`        - ${emoji} ${sub.name}`);
        });
        if (cat.inventory_subcategories.length > 3) {
          console.log(`        ... and ${cat.inventory_subcategories.length - 3} more`);
        }
      }
      if (cat.other_business_categories.length > 0) {
        console.log(`      Child categories: ${cat.other_business_categories.length}`);
      }
    });
    console.log('');
  }

  await prisma.$disconnect();
}

checkClothingCategories().catch(console.error);
