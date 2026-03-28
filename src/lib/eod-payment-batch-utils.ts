import { prisma } from '@/lib/prisma'

/**
 * createEODPaymentBatches
 *
 * Called at EOD save time. Finds all QUEUED (and legacy REQUEST) payments
 * for any expense account linked to the business and groups them into a
 * single EODPaymentBatch for the cashier to review.
 *
 * - Idempotent: if a PENDING_REVIEW batch already exists for this business+date,
 *   new QUEUED payments are added to that batch rather than creating a duplicate.
 * - Returns { batchId, paymentCount } so the caller can include it in the response.
 *   Returns { batchId: null, paymentCount: 0 } when there are no QUEUED payments.
 */
export async function createEODPaymentBatches(
  businessId: string,
  reportDate: Date
): Promise<{ batchId: string | null; paymentCount: number }> {
  // Find all pending payments (QUEUED, REQUEST, or SUBMITTED) whose expense account belongs to this business.
  // SUBMITTED covers payments created directly via QuickPaymentModal.
  // Exclude PETTY_CASH_SPEND, PETTY_CASH_RETURN — handled outside the batch flow.
  // Exclude MEAL_PROGRAM — handled separately via createEODMealBatch().
  // Exclude MEAL_BATCH — approved via the dedicated meal-program/approve endpoint.
  const queuedPayments = await prisma.expenseAccountPayments.findMany({
    where: {
      status: { in: ['QUEUED', 'REQUEST', 'SUBMITTED'] },
      expenseAccount: { businessId },
      paymentType: { notIn: ['PETTY_CASH_SPEND', 'PETTY_CASH_RETURN', 'MEAL_PROGRAM', 'MEAL_BATCH'] },
    },
    select: { id: true },
  })

  if (queuedPayments.length === 0) {
    return { batchId: null, paymentCount: 0 }
  }

  const paymentIds = queuedPayments.map((p) => p.id)

  // Normalise to date-only (strip time) so the unique check works regardless of time zone
  const eodDate = new Date(reportDate)
  eodDate.setUTCHours(0, 0, 0, 0)

  // Re-use an existing PENDING_REVIEW batch for the same business+date if one exists
  const existingBatch = await prisma.eODPaymentBatch.findFirst({
    where: { businessId, eodDate, status: 'PENDING_REVIEW' },
    select: { id: true },
  })

  const batchId = existingBatch
    ? existingBatch.id
    : (
        await prisma.eODPaymentBatch.create({
          data: { businessId, eodDate, status: 'PENDING_REVIEW' },
          select: { id: true },
        })
      ).id

  // Move payments: QUEUED / REQUEST → PENDING_APPROVAL and link to batch
  await prisma.expenseAccountPayments.updateMany({
    where: { id: { in: paymentIds } },
    data: { status: 'PENDING_APPROVAL', eodBatchId: batchId },
  })

  return { batchId, paymentCount: paymentIds.length }
}

/**
 * createEODMealBatch
 *
 * Called at EOD save time alongside createEODPaymentBatches.
 * Consolidates all unbatched QUEUED MEAL_PROGRAM payments for a business into
 * a single MEAL_BATCH payment request per expense account per day.
 *
 * - Idempotent: already-batched meals (eodMealBatchId IS NOT NULL) are skipped.
 * - Returns { batchCount, totalAmount } for logging.
 */
export async function createEODMealBatch(
  businessId: string,
  reportDate: Date
): Promise<{ batchCount: number; totalAmount: number }> {
  // Find all unbatched QUEUED MEAL_PROGRAM payments for this business
  const unbatched = await prisma.expenseAccountPayments.findMany({
    where: {
      status: 'QUEUED',
      paymentType: 'MEAL_PROGRAM',
      eodMealBatchId: null,
      expenseAccount: { businessId },
    },
    select: { id: true, amount: true, expenseAccountId: true, createdBy: true, paymentDate: true },
  })

  if (unbatched.length === 0) return { batchCount: 0, totalAmount: 0 }

  // Group by expenseAccountId (each account gets its own batch)
  const byAccount = new Map<string, typeof unbatched>()
  for (const p of unbatched) {
    const list = byAccount.get(p.expenseAccountId) ?? []
    list.push(p)
    byAccount.set(p.expenseAccountId, list)
  }

  const dateLabel = reportDate.toISOString().split('T')[0]
  let totalAmount = 0
  let batchCount = 0

  for (const [expenseAccountId, items] of byAccount.entries()) {
    const batchTotal = items.reduce((s, p) => s + Number(p.amount), 0)
    const createdBy = items[0].createdBy

    // Create the single consolidated batch payment request
    const batch = await prisma.expenseAccountPayments.create({
      data: {
        expenseAccountId,
        payeeType: 'NONE',
        amount: batchTotal,
        paymentDate: reportDate,
        notes: `Employee meal program EOD batch — ${items.length} meal${items.length !== 1 ? 's' : ''} — ${dateLabel}`,
        status: 'QUEUED',
        paymentType: 'MEAL_BATCH',
        isFullPayment: true,
        createdBy,
      },
      select: { id: true },
    })

    // Link individual meal payments to the batch
    await prisma.expenseAccountPayments.updateMany({
      where: { id: { in: items.map((p) => p.id) } },
      data: { eodMealBatchId: batch.id },
    })

    totalAmount += batchTotal
    batchCount++
  }

  return { batchCount, totalAmount }
}
