/**
 * scripts/migrate-meal-program-batches.js
 *
 * One-time migration for MBM-167: Employee Meal Program EOD Batch Payment
 *
 * What this does:
 * 1. APPROVED individual meals → mark PAID (stuck, already processed)
 * 2. PENDING_APPROVAL individual meals (in EOD batch) → pull out of EOD batch,
 *    reset to QUEUED, then consolidate into one MEAL_BATCH per (account + day)
 * 3. QUEUED individual meals with no batch → consolidate into MEAL_BATCH per (account + day)
 *
 * Run: node scripts/migrate-meal-program-batches.js
 */

require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function dayKey(date) {
  return new Date(date).toISOString().split('T')[0]
}

async function main() {
  console.log('=== MBM-167: Meal Program Batch Migration ===\n')

  // --- Part 1: Fix APPROVED individual meals → mark PAID ---
  const approvedMeals = await prisma.expenseAccountPayments.findMany({
    where: { paymentType: 'MEAL_PROGRAM', status: 'APPROVED' },
    select: { id: true },
  })
  if (approvedMeals.length > 0) {
    await prisma.expenseAccountPayments.updateMany({
      where: { id: { in: approvedMeals.map((p) => p.id) } },
      data: { status: 'PAID', paidAt: new Date() },
    })
    console.log(`✓ Marked ${approvedMeals.length} APPROVED individual meals as PAID`)
  } else {
    console.log('  No APPROVED individual meals found')
  }

  // --- Part 2: Pull PENDING_APPROVAL meals out of EOD batches ---
  const pendingMeals = await prisma.expenseAccountPayments.findMany({
    where: { paymentType: 'MEAL_PROGRAM', status: 'PENDING_APPROVAL', eodMealBatchId: null },
    select: { id: true, eodBatchId: true },
  })
  if (pendingMeals.length > 0) {
    await prisma.expenseAccountPayments.updateMany({
      where: { id: { in: pendingMeals.map((p) => p.id) } },
      data: { status: 'QUEUED', eodBatchId: null, batchSubmissionId: null },
    })
    console.log(`✓ Reset ${pendingMeals.length} PENDING_APPROVAL individual meals → QUEUED (removed from EOD batch)`)
  } else {
    console.log('  No PENDING_APPROVAL individual meals found')
  }

  // --- Part 3: Batch all unbatched QUEUED individual meals by (account + day) ---
  const unbatched = await prisma.expenseAccountPayments.findMany({
    where: { paymentType: 'MEAL_PROGRAM', status: 'QUEUED', eodMealBatchId: null },
    select: { id: true, amount: true, expenseAccountId: true, createdBy: true, paymentDate: true },
    orderBy: { paymentDate: 'asc' },
  })

  if (unbatched.length === 0) {
    console.log('  No unbatched QUEUED meals to consolidate')
    await prisma.$disconnect()
    return
  }

  console.log(`\nConsolidating ${unbatched.length} unbatched QUEUED meals...`)

  // Group by expenseAccountId + calendar day
  const groups = new Map()
  for (const p of unbatched) {
    const key = `${p.expenseAccountId}::${dayKey(p.paymentDate)}`
    if (!groups.has(key)) {
      groups.set(key, { expenseAccountId: p.expenseAccountId, date: p.paymentDate, items: [] })
    }
    groups.get(key).items.push(p)
  }

  let batchesCreated = 0
  let totalGrouped = 0

  for (const [, group] of groups.entries()) {
    const total = group.items.reduce((s, p) => s + Number(p.amount), 0)
    const dateLabel = dayKey(group.date)
    const createdBy = group.items[0].createdBy

    const batch = await prisma.expenseAccountPayments.create({
      data: {
        expenseAccountId: group.expenseAccountId,
        payeeType: 'NONE',
        amount: total,
        paymentDate: group.date,
        notes: `Employee meal program EOD batch — ${group.items.length} meal${group.items.length !== 1 ? 's' : ''} — ${dateLabel}`,
        status: 'QUEUED',
        paymentType: 'MEAL_BATCH',
        isFullPayment: true,
        createdBy,
      },
      select: { id: true },
    })

    await prisma.expenseAccountPayments.updateMany({
      where: { id: { in: group.items.map((p) => p.id) } },
      data: { eodMealBatchId: batch.id },
    })

    console.log(`  ✓ ${dateLabel} — ${group.items.length} meals — $${total.toFixed(2)} → MEAL_BATCH [${batch.id.slice(0, 8)}]`)
    batchesCreated++
    totalGrouped += group.items.length
  }

  console.log(`\n✅ Done. Created ${batchesCreated} MEAL_BATCH request(s) covering ${totalGrouped} individual meals.`)
  console.log('   Cashier can approve each batch from the pending actions panel.\n')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
