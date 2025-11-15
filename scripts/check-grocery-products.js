const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const businessId = 'grocery-demo-business';
    
    const products = await prisma.businessProducts.count({
      where: { businessId }
    });
    
    const variants = await prisma.productVariants.count({
      where: { business_products: { businessId } }
    });
    
    console.log('Grocery Demo Business Products:', products);
    console.log('Product Variants:', variants);
    
    if (products > 0) {
      const sampleProduct = await prisma.businessProducts.findFirst({
        where: { businessId },
        include: { productVariants: { take: 1 } }
      });
      console.log('\nSample Product:', sampleProduct?.name);
      console.log('Sample Variant ID:', sampleProduct?.productVariants[0]?.id);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
