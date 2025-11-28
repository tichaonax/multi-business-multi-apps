const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGroceryData() {
  try {
    // Find a grocery business
    const groceryBiz = await prisma.business.findFirst({
      where: { businessType: 'grocery' }
    });

    if (!groceryBiz) {
      console.log('No grocery businesses found');
      return;
    }

    console.log('Grocery Business:', groceryBiz.name, '(ID:', groceryBiz.id + ')');

    // Check product variants with attributes
    const variants = await prisma.productVariant.findMany({
      where: { product: { businessId: groceryBiz.id } },
      take: 10,
      include: { product: true }
    });

    console.log('\nTotal variants:', variants.length);
    console.log('\nSample inventory items:');
    variants.forEach(v => {
      console.log('- Name:', v.name);
      console.log('  SKU:', v.sku);
      console.log('  Attributes:', JSON.stringify(v.attributes));
      console.log('  Cost:', v.costPrice, '| Price:', v.basePrice);
      console.log('  Margin:', v.basePrice && v.costPrice ?
        (((v.basePrice - v.costPrice) / v.basePrice) * 100).toFixed(1) + '%' : 'N/A');
      console.log('  Stock:', v.stockQuantity);
      console.log('');
    });

    // Check if there are attributes that could indicate organic/local/seasonal
    const totalVariants = await prisma.productVariant.count({
      where: { product: { businessId: groceryBiz.id } }
    });

    console.log('Total grocery inventory items:', totalVariants);

  } finally {
    await prisma.$disconnect();
  }
}

checkGroceryData().catch(console.error);
