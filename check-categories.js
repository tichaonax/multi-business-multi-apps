const { PrismaClient } = require('@prisma/client');

async function checkCategories() {
  const prisma = new PrismaClient();

  try {
    const categories = await prisma.business_categories.findMany({
      select: {
        businessType: true,
        name: true,
        businessId: true
      },
      orderBy: [
        { businessType: 'asc' },
        { displayOrder: 'asc' }
      ]
    });

    console.log('=== CATEGORIES SEEDED ===');
    categories.forEach(cat => {
      console.log(`${cat.businessType}: ${cat.name} (businessId: ${cat.businessId})`);
    });

    console.log(`\n=== SUMMARY ===`);
    const byType = categories.reduce((acc, cat) => {
      acc[cat.businessType] = (acc[cat.businessType] || 0) + 1;
      return acc;
    }, {});

    Object.entries(byType).forEach(([type, count]) => {
      console.log(`${type}: ${count} categories`);
    });

    const nullBusinessId = categories.filter(cat => cat.businessId === null).length;
    console.log(`\n✅ Categories with NULL businessId: ${nullBusinessId}/${categories.length}`);

    if (nullBusinessId === categories.length) {
      console.log('🎉 SUCCESS: All categories are properly type-based (businessId = NULL)!');
    } else {
      console.log('❌ ISSUE: Some categories still have businessId set!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();