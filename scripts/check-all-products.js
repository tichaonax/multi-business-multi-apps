const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllProducts() {
  try {
    console.log('=== Checking All Products ===\n');

    // Total BusinessProducts
    const totalProducts = await prisma.businessProducts.count();
    console.log('Total BusinessProducts:', totalProducts);

    // Clothing products
    const clothingCount = await prisma.businessProducts.count({
      where: { businessType: 'clothing' }
    });
    console.log('Clothing BusinessProducts:', clothingCount);

    // Restaurant products
    const restaurantCount = await prisma.businessProducts.count({
      where: { businessType: 'restaurant' }
    });
    console.log('Restaurant BusinessProducts:', restaurantCount);

    // Check domains
    const domains = await prisma.inventoryDomains.findMany();
    console.log('\n=== All Inventory Domains ===');
    console.log(JSON.stringify(domains, null, 2));

    // Check business categories with domains
    const categories = await prisma.businessCategories.findMany({
      where: {
        domainId: { not: null }
      },
      include: {
        domain: true,
        _count: {
          select: { business_products: true }
        }
      },
      take: 10
    });
    console.log('\n=== Business Categories with Domains (sample) ===');
    console.log(JSON.stringify(categories, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllProducts();
