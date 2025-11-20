const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔧 Creating default variants for clothing products...\n');

    // Find all clothing products without variants
    const productsWithoutVariants = await prisma.businessProducts.findMany({
      where: {
        businessType: 'clothing',
        isActive: true,
        product_variants: {
          none: {}
        }
      },
      include: {
        product_variants: true
      }
    });

    console.log(`📦 Found ${productsWithoutVariants.length} clothing products without variants\n`);

    if (productsWithoutVariants.length === 0) {
      console.log('✅ All clothing products already have variants!');
      await prisma.$disconnect();
      return;
    }

    let created = 0;
    let failed = 0;

    // Create default variant for each product
    for (const product of productsWithoutVariants) {
      try {
        const variant = await prisma.productVariants.create({
          data: {
            productId: product.id,
            sku: product.sku || `${product.id.substring(0, 8)}-DEFAULT`,
            name: 'Default',
            price: parseFloat(product.basePrice || '0'),
            originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : null,
            stockQuantity: 0, // Set to 0, can be updated via inventory management
            reorderLevel: 10,
            isActive: product.isActive,
            isAvailable: true,
            attributes: {
              isDefault: true,
              size: 'One Size',
              color: 'Standard'
            },
            updatedAt: new Date()
          }
        });

        created++;
        if (created % 100 === 0) {
          console.log(`✅ Created ${created} default variants...`);
        }
      } catch (error) {
        failed++;
        console.error(`❌ Failed to create variant for product ${product.id}: ${error.message}`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully created: ${created}`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed}`);
    }
    console.log('\n🎉 Done!');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
