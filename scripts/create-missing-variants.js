const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function createMissingVariants() {
  try {
    console.log('🔍 Finding clothing products without variants...\n');

    // Find all clothing products without variants
    const productsWithoutVariants = await prisma.businessProducts.findMany({
      where: {
        businessType: 'clothing',
        product_variants: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        basePrice: true
      }
    });

    console.log(`Found ${productsWithoutVariants.length} products without variants\n`);

    if (productsWithoutVariants.length === 0) {
      console.log('✅ All products already have variants!');
      return;
    }

    console.log('Creating default variants...\n');

    let created = 0;
    for (const product of productsWithoutVariants) {
      try {
        await prisma.productVariants.create({
          data: {
            id: randomUUID(),
            productId: product.id,
            name: 'Default',
            sku: product.sku || `SKU-${product.id.slice(0, 8)}`,
            stockQuantity: 0,
            reorderLevel: 5,
            price: Number(product.basePrice) || 0.00,
            isActive: true,
            updatedAt: new Date()
          }
        });

        created++;

        if (created % 100 === 0) {
          console.log(`Progress: ${created}/${productsWithoutVariants.length}`);
        }
      } catch (error) {
        console.error(`Error creating variant for product ${product.id}:`, error.message);
      }
    }

    console.log(`\n✅ Created ${created} variants successfully!`);
    console.log('\nProducts are now ready to show in inventory with 0 stock.\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingVariants();
