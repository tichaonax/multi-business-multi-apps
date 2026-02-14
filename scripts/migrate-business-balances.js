/**
 * Reconcile business_accounts.balance from completed BusinessOrders
 *
 * Runs on every service start (via seed:migration) to ensure balances are correct.
 *
 * For each business with completed+paid orders:
 * 1. Finds orders that have no matching businessTransactions deposit record
 * 2. Creates deposit transaction records for those orders
 * 3. Recalculates balance from the full transaction ledger
 * 4. Updates business_accounts.balance if it differs
 *
 * Idempotent — safe to run on every startup.
 *
 * Usage: node scripts/migrate-business-balances.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function reconcileBusinessBalances() {
  console.log('🏦 Reconciling business account balances...')

  // Clean up old bulk-backfill records (replaced by per-order records)
  const oldBackfills = await prisma.businessTransactions.deleteMany({
    where: { referenceType: 'balance-backfill-migration' },
  })
  if (oldBackfills.count > 0) {
    console.log(`   Cleaned up ${oldBackfills.count} old bulk-backfill record(s)`)
  }

  // Get admin user for createdBy on new transaction records
  const adminUser = await prisma.users.findFirst({
    where: { role: 'admin' },
    select: { id: true },
  })
  const systemUserId = adminUser?.id || 'system'

  // Get all businesses with completed+paid orders
  const orderTotals = await prisma.businessOrders.groupBy({
    by: ['businessId'],
    where: {
      status: 'COMPLETED',
      paymentStatus: 'PAID',
    },
    _sum: { totalAmount: true },
    _count: true,
  })

  if (orderTotals.length === 0) {
    console.log('   No completed+paid orders found. Nothing to reconcile.')
    return
  }

  let reconciled = 0

  for (const entry of orderTotals) {
    const businessId = entry.businessId
    const orderRevenue = Number(entry._sum.totalAmount || 0)

    // Get business name for logging
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { name: true },
    })
    const businessName = business?.name || businessId

    // Ensure business account exists
    let account = await prisma.businessAccounts.findUnique({
      where: { businessId },
    })

    if (!account) {
      account = await prisma.businessAccounts.create({
        data: {
          businessId,
          balance: 0,
          updatedAt: new Date(),
        },
      })
    }

    // Find completed+paid orders that have no matching deposit transaction
    // A matching transaction has referenceId = order.id and referenceType = 'order'
    const existingOrderTxnIds = await prisma.businessTransactions.findMany({
      where: {
        businessId,
        referenceType: 'order',
        type: 'deposit',
      },
      select: { referenceId: true },
    })
    const recordedOrderIds = new Set(existingOrderTxnIds.map(t => t.referenceId).filter(Boolean))

    const unrecordedOrders = await prisma.businessOrders.findMany({
      where: {
        businessId,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        id: { notIn: Array.from(recordedOrderIds) },
      },
      select: { id: true, orderNumber: true, totalAmount: true },
    })

    // Create deposit transaction records for unrecorded orders
    if (unrecordedOrders.length > 0) {
      // Batch create in a single transaction for efficiency
      await prisma.$transaction(async (tx) => {
        for (const order of unrecordedOrders) {
          const amount = Number(order.totalAmount)
          if (amount <= 0) continue

          await tx.businessTransactions.create({
            data: {
              businessId,
              amount,
              type: 'deposit',
              description: `Order revenue - ${order.orderNumber}`,
              referenceId: order.id,
              referenceType: 'order',
              balanceAfter: 0, // Will be corrected in reconciliation below
              createdBy: systemUserId,
              notes: 'Backfilled from completed order',
            },
          })
        }
      })
      console.log(`   ${businessName}: created ${unrecordedOrders.length} missing transaction records`)
    }

    // Now reconcile the balance from the full transaction ledger
    const deposits = await prisma.businessTransactions.aggregate({
      where: { businessId, type: { in: ['deposit', 'transfer', 'loan_received'] } },
      _sum: { amount: true },
    })
    const withdrawals = await prisma.businessTransactions.aggregate({
      where: { businessId, type: { in: ['withdrawal', 'loan_disbursement', 'loan_payment'] } },
      _sum: { amount: true },
    })

    const totalDeposits = Number(deposits._sum.amount || 0)
    const totalWithdrawals = Number(withdrawals._sum.amount || 0)
    const correctBalance = totalDeposits - totalWithdrawals
    const currentBalance = Number(account.balance)

    // Update if different (within 0.01 tolerance for floating point)
    if (Math.abs(correctBalance - currentBalance) >= 0.01) {
      await prisma.businessAccounts.update({
        where: { businessId },
        data: {
          balance: correctBalance,
          updatedAt: new Date(),
        },
      })
      console.log(`   ${businessName}: $${currentBalance.toFixed(2)} -> $${correctBalance.toFixed(2)}`)
      reconciled++
    }
  }

  if (reconciled === 0) {
    console.log('   All business balances are correct.')
  } else {
    console.log(`   Reconciled ${reconciled} business account balances.`)
  }

  console.log('✅ Business balance reconciliation complete')
}

// Export for use in seed-migration-data.js
module.exports = { reconcileBusinessBalances }

// Run standalone if executed directly
if (require.main === module) {
  reconcileBusinessBalances()
    .catch((err) => {
      console.error('Reconciliation failed:', err)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
