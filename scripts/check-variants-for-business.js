const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const businessId = process.argv[2] || 'grocery-demo-2';
    
    console.log(`Checking products and variants for: ${businessId}\n`);
    
    const products = await prisma.businessProducts.findMany({
      where: { businessId },
      include: {
        product_variants: {
          select: { id: true, sku: true, name: true, price: true, stockQuantity: true }
        }
      },
      take: 5
    });
    
    console.log(`Found ${products.length} products (showing first 5):\n`);
    
    products.forEach(p => {
      console.log(`Product: ${p.name} (${p.sku})`);
      console.log(`  Base Price: $${p.basePrice}`);
      console.log(`  Variants: ${p.product_variants.length}`);
      p.product_variants.forEach(v => {
        console.log(`    - ${v.name} | ID: ${v.id} | SKU: ${v.sku} | Price: $${v.price} | Stock: ${v.stockQuantity}`);
      });
      console.log('');
    });
    
    // Count total
    const totalProducts = await prisma.businessProducts.count({ where: { businessId } });
    const totalVariants = await prisma.productVariants.count({
      where: { business_products: { businessId } }
    });
    
    console.log(`\nTotals for ${businessId}:`);
    console.log(`  Products: ${totalProducts}`);
    console.log(`  Variants: ${totalVariants}`);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
