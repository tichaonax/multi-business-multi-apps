const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check order statuses
  const statusCounts = await prisma.businessOrders.groupBy({
    by: ['status', 'paymentStatus'],
    _count: true
  });
  console.log('=== Order Status Distribution ===');
  statusCounts.forEach(s => console.log(`  ${s.status} / ${s.paymentStatus}: ${s._count} orders`));

  // Check business transactions
  const txCount = await prisma.businessTransactions.count();
  console.log(`\n=== Business Transactions: ${txCount} total ===`);

  if (txCount > 0) {
    const txs = await prisma.businessTransactions.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, businessId: true, amount: true, type: true, description: true, balanceAfter: true }
    });
    txs.forEach(t => console.log(`  ${t.type}: $${t.amount} -> balance after: $${t.balanceAfter} (${t.description})`));
  }

  // Check business accounts
  const accounts = await prisma.businessAccounts.findMany({
    include: { businesses: { select: { name: true } } }
  });
  console.log('\n=== Business Accounts ===');
  accounts.forEach(a => console.log(`  ${a.businesses.name}: balance = $${a.balance}`));

  // Check a recent COMPLETED order to see if it went through PATCH
  const recentOrder = await prisma.businessOrders.findFirst({
    where: { status: 'COMPLETED' },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, orderNumber: true, status: true, paymentStatus: true, totalAmount: true, businessId: true, createdAt: true, updatedAt: true }
  });
  if (recentOrder) {
    console.log('\n=== Most Recent COMPLETED Order ===');
    console.log(JSON.stringify(recentOrder, null, 2));
    console.log('Created and Updated same time?', recentOrder.createdAt.getTime() === recentOrder.updatedAt.getTime());
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
