const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const businessTypes = ['clothing', 'hardware', 'grocery', 'restaurant'];

    console.log('🔍 Checking product variants across all business types...\n');

    for (const type of businessTypes) {
      const products = await prisma.businessProducts.findMany({
        where: {
          businessType: type,
          isActive: true
        },
        include: {
          product_variants: true
        }
      });

      const withVariants = products.filter(p => p.product_variants && p.product_variants.length > 0).length;
      const withoutVariants = products.filter(p => !p.product_variants || p.product_variants.length === 0).length;

      console.log(`📦 ${type.toUpperCase()}`);
      console.log(`   Total: ${products.length}`);
      console.log(`   ✅ With variants: ${withVariants}`);
      console.log(`   ❌ Without variants: ${withoutVariants}`);
      console.log('');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
