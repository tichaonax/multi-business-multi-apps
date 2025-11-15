const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const businessId = process.argv[2] || 'grocery-demo-2';

    console.log(`Checking orders for: ${businessId}\n`);

    const orders = await prisma.businessOrders.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        business_order_items: {
          include: {
            product_variants: {
              include: {
                business_products: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${orders.length} orders (showing last 10):\n`);

    orders.forEach(order => {
      console.log(`Order: ${order.orderNumber}`);
      console.log(`  Status: ${order.status} | Payment: ${order.paymentStatus}`);
      console.log(`  Total: $${order.totalAmount} | Items: ${order.business_order_items.length}`);
      console.log(`  Created: ${new Date(order.createdAt).toLocaleString()}`);
      console.log('');
    });

    const totalOrders = await prisma.businessOrders.count({ where: { businessId } });
    console.log(`\nTotal orders for ${businessId}: ${totalOrders}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
