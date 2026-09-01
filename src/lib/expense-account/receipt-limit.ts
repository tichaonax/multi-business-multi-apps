import { prisma } from '@/lib/prisma'

export interface ReceiptLimitCheck {
  /** Whether this payment even has an expected-amount cap (combo-pay-linked or opt-in advance). Payments with none skip the check entirely. */
  hasLimit: boolean
  ok: boolean
  expectedAmount: number
  /** Sum of all other receipts for this payment (excluding the one being edited, if any). */
  currentTotal: number
  /** currentTotal + the amount being saved. */
  newTotal: number
  /** expectedAmount - newTotal. Negative when over. */
  remaining: number
  /** How far over the limit newTotal would be. 0 when not over. */
  excessAmount: number
}

/**
 * MBM-286: real-time over-limit check for a receipt being created or edited.
 * Only payments with an ExpensePaymentReceiptReviews row (combo-pay disbursements
 * automatically, opt-in advances otherwise — see MBM-271) have a cap at all; a
 * routine payment to a known supplier has no expected amount to check against.
 */
export async function checkReceiptLimit(params: {
  expensePaymentId: string
  amount: number
  excludeReceiptId?: string
}): Promise<ReceiptLimitCheck> {
  const { expensePaymentId, amount, excludeReceiptId } = params

  const review = await prisma.expensePaymentReceiptReviews.findUnique({
    where: { expensePaymentId },
    select: { expectedAmount: true },
  })

  if (!review) {
    return { hasLimit: false, ok: true, expectedAmount: 0, currentTotal: 0, newTotal: amount, remaining: 0, excessAmount: 0 }
  }

  const otherReceipts = await prisma.expensePaymentReceipts.findMany({
    where: {
      expensePaymentId,
      ...(excludeReceiptId ? { id: { not: excludeReceiptId } } : {}),
    },
    select: { amount: true },
  })

  const currentTotal = otherReceipts.reduce((sum, r) => sum + Number(r.amount), 0)
  const expectedAmount = Number(review.expectedAmount)
  const newTotal = currentTotal + amount
  const remaining = expectedAmount - newTotal
  const excessAmount = remaining < 0 ? Math.abs(remaining) : 0

  return { hasLimit: true, ok: remaining >= 0, expectedAmount, currentTotal, newTotal, remaining, excessAmount }
}
