const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    console.log('Checking clothing products...\n');

    // Check total products
    const totalProducts = await prisma.businessProducts.count({
      where: { businessType: 'clothing' }
    });
    console.log(`Total clothing products: ${totalProducts}\n`);

    // Check sample products with categories
    const products = await prisma.businessProducts.findMany({
      where: { businessType: 'clothing' },
      include: {
        business_categories: {
          select: { name: true, domainId: true }
        },
        product_variants: true
      },
      take: 5
    });

    console.log('Sample products:\n');
    products.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   SKU: ${p.sku}`);
      console.log(`   Category: ${p.business_categories?.name || 'NO CATEGORY'}`);
      console.log(`   Domain ID: ${p.business_categories?.domainId || 'NO DOMAIN'}`);
      console.log(`   Variants: ${p.product_variants.length}`);
      if (p.product_variants.length > 0) {
        console.log(`   Stock: ${p.product_variants[0].stockQuantity}`);
      }
      console.log('');
    });

    // Check products by domain
    const domains = await prisma.inventoryDomains.findMany({
      where: { businessType: 'clothing' },
      select: { id: true, name: true, emoji: true }
    });

    console.log('\nProducts by domain:\n');
    for (const domain of domains) {
      const count = await prisma.businessProducts.count({
        where: {
          businessType: 'clothing',
          business_categories: {
            domainId: domain.id
          }
        }
      });
      console.log(`${domain.emoji} ${domain.name}: ${count} products`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
