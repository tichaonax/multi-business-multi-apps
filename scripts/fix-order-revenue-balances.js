/**
 * Script to retroactively credit business balances for existing completed orders.
 * This ensures all paid revenue is tracked in business accounts.
 *
 * Run: node scripts/fix-order-revenue-balances.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOrderRevenueBalances() {
  console.log('Finding completed & paid orders without balance transactions...\n');

  try {
    // Find all completed orders with PAID status
    const completedOrders = await prisma.businessOrders.findMany({
      where: {
        status: 'COMPLETED',
        paymentStatus: 'PAID'
      },
      include: {
        businesses: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${completedOrders.length} completed & paid orders\n`);

    if (completedOrders.length === 0) {
      console.log('No orders to process.');
      return;
    }

    // Group by business
    const ordersByBusiness = {};
    for (const order of completedOrders) {
      const bizId = order.businessId;
      if (!ordersByBusiness[bizId]) {
        ordersByBusiness[bizId] = {
          businessName: order.businesses?.name || 'Unknown',
          orders: []
        };
      }
      ordersByBusiness[bizId].orders.push(order);
    }

    let totalFixed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const [businessId, data] of Object.entries(ordersByBusiness)) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Business: ${data.businessName} (${businessId})`);
      console.log(`Orders: ${data.orders.length}`);

      // Check if business account exists, create if not
      let businessAccount = await prisma.businessAccounts.findUnique({
        where: { businessId }
      });

      if (!businessAccount) {
        console.log('  Creating business account...');
        businessAccount = await prisma.businessAccounts.create({
          data: {
            businessId,
            balance: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      let currentBalance = Number(businessAccount.balance);
      console.log(`  Current Balance: $${currentBalance.toFixed(2)}`);

      for (const order of data.orders) {
        const orderTotal = Number(order.totalAmount);

        // Check if transaction already exists for this order
        const existingTx = await prisma.businessTransactions.findFirst({
          where: {
            businessId,
            referenceId: order.id,
            referenceType: 'order',
            type: 'deposit'
          }
        });

        if (existingTx) {
          console.log(`  [SKIP] ${order.orderNumber} - Already credited`);
          totalSkipped++;
          continue;
        }

        try {
          const newBalance = currentBalance + orderTotal;

          await prisma.$transaction(async (tx) => {
            // Update business account
            await tx.businessAccounts.update({
              where: { businessId },
              data: {
                balance: newBalance,
                updatedAt: new Date()
              }
            });

            // Create transaction record (use system admin ID)
            await tx.businessTransactions.create({
              data: {
                businessId,
                type: 'deposit',
                amount: orderTotal,
                description: `[RETROACTIVE] Order revenue - ${order.orderNumber}`,
                referenceId: order.id,
                referenceType: 'order',
                balanceAfter: newBalance,
                notes: `Retroactively added - Order date: ${order.createdAt?.toISOString().split('T')[0]}`,
                createdBy: '2cd606cd-f91a-49e3-9053-04214343c472' // System admin
              }
            });
          });

          console.log(`  [FIXED] ${order.orderNumber} - +$${orderTotal.toFixed(2)} -> Balance: $${newBalance.toFixed(2)}`);
          currentBalance = newBalance;
          totalFixed++;

        } catch (error) {
          console.log(`  [ERROR] ${order.orderNumber} - ${error.message}`);
          totalErrors++;
        }
      }

      // Show final balance for this business
      const finalAccount = await prisma.businessAccounts.findUnique({
        where: { businessId }
      });
      console.log(`  Final Balance: $${Number(finalAccount.balance).toFixed(2)}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total orders processed: ${completedOrders.length}`);
    console.log(`Fixed: ${totalFixed}`);
    console.log(`Skipped (already done): ${totalSkipped}`);
    console.log(`Errors: ${totalErrors}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixOrderRevenueBalances();
