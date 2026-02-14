/**
 * Migration: Backfill business_accounts.balance from completed BusinessOrders
 *
 * Problem: processBusinessTransaction was never called for historical orders,
 * so business_accounts.balance is 0 even though businesses have completed orders.
 *
 * This script:
 * 1. Aggregates totalAmount from COMPLETED+PAID BusinessOrders per business
 * 2. Subtracts any existing withdrawal transactions (expense deposits, etc.)
 * 3. Updates business_accounts.balance with the correct amount
 * 4. Creates a businessTransactions record for audit trail
 *
 * Safe to run multiple times (idempotent) - uses a migration reference marker.
 *
 * Usage: node scripts/migrate-business-balances.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const MIGRATION_REF = 'balance-backfill-migration'

async function main() {
  console.log('=== Business Balance Migration ===\n')

  // 1. Get completed+paid order totals per business
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
    console.log('No completed+paid orders found. Nothing to migrate.')
    return
  }

  // 2. Get any existing business transactions (in case some were already recorded)
  const existingDeposits = await prisma.businessTransactions.groupBy({
    by: ['businessId'],
    where: { type: 'deposit' },
    _sum: { amount: true },
  })

  const existingWithdrawals = await prisma.businessTransactions.groupBy({
    by: ['businessId'],
    where: { type: 'withdrawal' },
    _sum: { amount: true },
  })

  const depositMap = new Map(existingDeposits.map(d => [d.businessId, Number(d._sum.amount || 0)]))
  const withdrawalMap = new Map(existingWithdrawals.map(w => [w.businessId, Number(w._sum.amount || 0)]))

  // 3. Check if migration already ran
  const migrationMarker = await prisma.businessTransactions.findFirst({
    where: { referenceType: MIGRATION_REF },
  })

  if (migrationMarker) {
    console.log('Migration already ran (found migration marker). Skipping.')
    console.log('To re-run, delete businessTransactions with referenceType:', MIGRATION_REF)
    return
  }

  console.log('Found order totals for', orderTotals.length, 'businesses:\n')

  let totalUpdated = 0

  for (const entry of orderTotals) {
    const businessId = entry.businessId
    const orderRevenue = Number(entry._sum.totalAmount || 0)
    const orderCount = entry._count
    const existingDepositTotal = depositMap.get(businessId) || 0
    const existingWithdrawalTotal = withdrawalMap.get(businessId) || 0

    // Revenue not yet tracked = order revenue minus already-deposited amounts
    const unrecordedRevenue = orderRevenue - existingDepositTotal

    if (unrecordedRevenue <= 0) {
      console.log(`  [SKIP] Business ${businessId}: revenue already recorded`)
      continue
    }

    // New balance = unrecorded revenue - existing withdrawals (withdrawals already subtracted from balance)
    const correctBalance = orderRevenue - existingWithdrawalTotal

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

    const currentBalance = Number(account.balance)

    // Update balance and create audit record in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.businessAccounts.update({
        where: { businessId },
        data: {
          balance: correctBalance,
          updatedAt: new Date(),
        },
      })

      // Create a migration transaction record for audit trail
      // Use the first admin user as createdBy
      const adminUser = await tx.users.findFirst({
        where: { role: 'admin' },
        select: { id: true },
      })

      await tx.businessTransactions.create({
        data: {
          businessId,
          amount: unrecordedRevenue,
          type: 'deposit',
          description: `Balance migration - ${orderCount} completed orders`,
          referenceType: MIGRATION_REF,
          balanceAfter: correctBalance,
          createdBy: adminUser?.id || 'system',
          notes: `Backfilled from ${orderCount} completed+paid orders. Original balance: $${currentBalance.toFixed(2)}, Order revenue: $${orderRevenue.toFixed(2)}`,
        },
      })
    })

    console.log(`  [OK] ${businessName}: $${currentBalance.toFixed(2)} -> $${correctBalance.toFixed(2)} (${orderCount} orders, $${orderRevenue.toFixed(2)} revenue)`)
    totalUpdated++
  }

  console.log(`\nDone! Updated ${totalUpdated} business account balances.`)
}

main()
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
