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
  // Find all QUEUED / legacy REQUEST payments whose expense account belongs to this business.
  // Exclude PETTY_CASH_SPEND and PETTY_CASH_RETURN — those are handled outside the batch flow.
  const queuedPayments = await prisma.expenseAccountPayments.findMany({
    where: {
      status: { in: ['QUEUED', 'REQUEST'] },
      expenseAccount: { businessId },
      paymentType: { notIn: ['PETTY_CASH_SPEND', 'PETTY_CASH_RETURN'] },
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
