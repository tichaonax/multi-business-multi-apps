const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicateDemos() {
  console.log('🧹 Cleaning up duplicate demo businesses...\n');

  try {
    // Find all demo businesses grouped by type
    const allBusinesses = await prisma.businesses.findMany({
      where: {
        OR: [
          { isDemo: true },
          { name: { contains: '[Demo]' } },
          { id: { contains: 'demo' } }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${allBusinesses.length} demo businesses\n`);

    // Group by type
    const byType = {};
    allBusinesses.forEach(b => {
      if (!byType[b.type]) byType[b.type] = [];
      byType[b.type].push(b);
    });

    let totalDeleted = 0;

    for (const [type, businesses] of Object.entries(byType)) {
      console.log(`\n📂 ${type.toUpperCase()} businesses: ${businesses.length} found`);

      if (businesses.length <= 1) {
        console.log(`   ✅ Only 1 demo business - no duplicates`);
        if (businesses.length === 1) {
          console.log(`   Keeping: "${businesses[0].name}" (${businesses[0].id})`);
        }
        continue;
      }

      // Keep the first one (oldest), delete the rest
      const toKeep = businesses[0];
      const toDelete = businesses.slice(1);

      console.log(`   ✅ Keeping: "${toKeep.name}" (${toKeep.id})`);
      console.log(`   ❌ Deleting ${toDelete.length} duplicate(s):`);

      for (const business of toDelete) {
        console.log(`      - "${business.name}" (${business.id})`);

        try {
          // Delete related data first (products, stock movements, etc.)

          // Get product IDs for this business
          const productIds = await prisma.businessProducts.findMany({
            where: { businessId: business.id },
            select: { id: true }
          });
          const prodIds = productIds.map(p => p.id);

          if (prodIds.length > 0) {
            console.log(`        → Deleting ${prodIds.length} products and related data...`);

            // Delete product variants
            await prisma.productVariants.deleteMany({
              where: { productId: { in: prodIds } }
            });

            // Delete product attributes
            await prisma.productAttributes.deleteMany({
              where: { productId: { in: prodIds } }
            });

            // Delete stock movements
            await prisma.businessStockMovements.deleteMany({
              where: { businessId: business.id }
            });

            // Delete products
            await prisma.businessProducts.deleteMany({
              where: { businessId: business.id }
            });
          }

          // Delete the business
          await prisma.businesses.delete({
            where: { id: business.id }
          });

          console.log(`        ✅ Deleted successfully`);
          totalDeleted++;

        } catch (error) {
          console.error(`        ❌ Error deleting: ${error.message}`);
        }
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   Total demo businesses deleted: ${totalDeleted}`);
    console.log(`   Remaining demo businesses: ${allBusinesses.length - totalDeleted}`);
    console.log('\n✅ Cleanup complete!\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateDemos()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
