const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBusinessTypes() {
  try {
    console.log('=== Checking BusinessProduct business types ===\n');

    // Group by businessType
    const products = await prisma.businessProducts.findMany({
      select: {
        id: true,
        name: true,
        businessType: true,
        categoryId: true,
        business_categories: {
          select: {
            id: true,
            name: true,
            businessType: true,
            domainId: true,
            domain: {
              select: { name: true, businessType: true }
            }
          }
        }
      },
      take: 10
    });

    // Count by business type
    const allProducts = await prisma.businessProducts.findMany({
      select: { businessType: true }
    });

    const typeCount = {};
    allProducts.forEach(p => {
      typeCount[p.businessType] = (typeCount[p.businessType] || 0) + 1;
    });

    console.log('BusinessType distribution:', typeCount);
    console.log('\n=== Sample products ===');
    products.forEach(p => {
      console.log(`\nProduct: ${p.name}`);
      console.log(`  businessType: ${p.businessType}`);
      console.log(`  category: ${p.business_categories?.name} (${p.business_categories?.businessType})`);
      console.log(`  domain: ${p.business_categories?.domain?.name} (${p.business_categories?.domain?.businessType})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBusinessTypes();
