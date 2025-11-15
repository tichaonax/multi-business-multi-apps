const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const businessId = 'grocery-demo-business';
    
    const variants = await prisma.productVariants.count({
      where: { business_products: { businessId } }
    });
    
    console.log('Product Variants for grocery-demo-business:', variants);
    
    if (variants > 0) {
      const sample = await prisma.productVariants.findFirst({
        where: { business_products: { businessId } },
        select: { id: true, sku: true, name: true }
      });
      console.log('\nSample variant:');
      console.log('  ID:', sample.id);
      console.log('  SKU:', sample.sku);
      console.log('  Name:', sample.name);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
