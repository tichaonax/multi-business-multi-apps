const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Get business IDs
    const businesses = await prisma.businesses.findMany({
      where: { isDemo: false },
      select: { id: true, name: true }
    });
    const businessIds = businesses.map(b => b.id);
    console.log('Business IDs:', businessIds);
    console.log('');

    // Check customerLaybys
    console.log('=== CUSTOMER LAYBYS ===');
    const allLaybys = await prisma.customerLayby.findMany({
      select: {
        id: true,
        customerId: true,
        customer: {
          select: {
            businessId: true,
            businesses: { select: { name: true } }
          }
        }
      }
    });
    console.log('Total laybys:', allLaybys.length);

    for (const layby of allLaybys) {
      const wouldBackup = layby.customer?.businessId && businessIds.includes(layby.customer.businessId);
      console.log(`  Layby ${layby.id}:`);
      console.log(`    customerId: ${layby.customerId}`);
      console.log(`    customer.businessId: ${layby.customer?.businessId || 'null'}`);
      if (layby.customer?.businesses) {
        console.log(`    Business: ${layby.customer.businesses.name}`);
      }
      console.log(`    Would backup? ${wouldBackup ? 'YES' : 'NO'}`);
    }
    console.log('');

    // Check customerLaybyPayments
    console.log('=== CUSTOMER LAYBY PAYMENTS ===');
    const allPayments = await prisma.customerLaybyPayment.findMany({
      select: {
        id: true,
        laybyId: true,
        layby: {
          select: {
            customerId: true,
            customer: {
              select: {
                businessId: true,
                businesses: { select: { name: true } }
              }
            }
          }
        }
      }
    });
    console.log('Total payments:', allPayments.length);

    for (const payment of allPayments) {
      const wouldBackup = payment.layby?.customer?.businessId && businessIds.includes(payment.layby.customer.businessId);
      console.log(`  Payment ${payment.id}:`);
      console.log(`    laybyId: ${payment.laybyId}`);
      console.log(`    customer.businessId: ${payment.layby?.customer?.businessId || 'null'}`);
      if (payment.layby?.customer?.businesses) {
        console.log(`    Business: ${payment.layby.customer.businesses.name}`);
      }
      console.log(`    Would backup? ${wouldBackup ? 'YES' : 'NO'}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
