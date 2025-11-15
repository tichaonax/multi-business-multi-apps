const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    console.log('Checking clothing products...\n');

    // Check total clothing products
    const totalProducts = await prisma.businessProducts.count({
      where: { businessType: 'clothing' }
    });
    console.log('Total clothing products:', totalProducts);

    // Get a sample with categories
    const products = await prisma.businessProducts.findMany({
      where: { businessType: 'clothing' },
      include: {
        business_categories: {
          include: {
            domain: {
              select: { id: true, name: true, emoji: true }
            }
          }
        },
        businesses: {
          select: { id: true, name: true, type: true }
        }
      },
      take: 5
    });

    console.log('\nSample products:', JSON.stringify(products, null, 2));

    // Check if domains exist
    const domains = await prisma.businessDomains.findMany({
      where: { businessType: 'clothing' },
      select: { id: true, name: true, emoji: true }
    });
    console.log('\n\nAvailable clothing domains:', JSON.stringify(domains, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
