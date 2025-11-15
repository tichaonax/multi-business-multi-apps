const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const businessId = 'grocery-demo-2';
    console.log('Cleaning up grocery-demo-2 products...');

    // Get all products
    const products = await prisma.businessProducts.findMany({
      where: { businessId },
      select: { id: true }
    });

    const productIds = products.map(p => p.id);
    console.log('Found', productIds.length, 'products');

    if (productIds.length > 0) {
      // Delete variants
      await prisma.productVariants.deleteMany({
        where: { productId: { in: productIds } }
      });
      console.log('Deleted variants');

      // Delete stock movements
      await prisma.businessStockMovements.deleteMany({
        where: { businessId }
      });
      console.log('Deleted stock movements');

      // Delete attributes
      await prisma.productAttributes.deleteMany({
        where: { productId: { in: productIds } }
      });
      console.log('Deleted attributes');

      // Delete products
      await prisma.businessProducts.deleteMany({
        where: { businessId }
      });
      console.log('Deleted products');
    }

    console.log('✅ Cleanup complete');
    console.log('\nNow running seed script for grocery-demo-2...\n');

    // Set environment variable to target this specific business
    process.env.TARGET_BUSINESS_ID = businessId;

    // Now run the seed function
    const { seed } = require('./seed-grocery-demo.js');
    await seed();

  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
