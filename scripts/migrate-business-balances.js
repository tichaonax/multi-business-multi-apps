/**
 * Reconcile business_accounts.balance for ALL businesses
 *
 * Runs on every service start (via seed:migration) to ensure balances are correct.
 *
 * Two phases:
 * 1. Backfill: Find COMPLETED+PAID orders missing transaction records, create them
 * 2. Reconcile: For EVERY business account, recalculate balance from transaction ledger
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

  // --- Phase 1: Backfill missing transaction records for completed orders ---

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

  for (const entry of orderTotals) {
    const businessId = entry.businessId

    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { name: true },
    })
    const businessName = business?.name || businessId

    // Ensure business account exists
    const existingAccount = await prisma.businessAccounts.findUnique({
      where: { businessId },
    })
    if (!existingAccount) {
      await prisma.businessAccounts.create({
        data: { businessId, balance: 0, updatedAt: new Date() },
      })
    }

    // Find completed+paid orders that have no matching deposit transaction
    const existingOrderTxnIds = await prisma.businessTransactions.findMany({
      where: { businessId, referenceType: 'order', type: 'deposit' },
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

    if (unrecordedOrders.length > 0) {
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
              balanceAfter: 0, // Corrected in phase 2
              createdBy: systemUserId,
              notes: 'Backfilled from completed order',
            },
          })
        }
      })
      console.log(`   ${businessName}: created ${unrecordedOrders.length} missing transaction records`)
    }
  }

  // --- Phase 2: Reconcile balance for ALL business accounts ---

  const allAccounts = await prisma.businessAccounts.findMany({
    include: { businesses: { select: { name: true } } },
  })

  let reconciled = 0

  for (const account of allAccounts) {
    const businessId = account.businessId
    const businessName = account.businesses?.name || businessId

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

    if (Math.abs(correctBalance - currentBalance) >= 0.01) {
      await prisma.businessAccounts.update({
        where: { businessId },
        data: { balance: correctBalance, updatedAt: new Date() },
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
