import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'

export const COMBO_REQUEST_EXPIRY_DAYS = 30

// Statuses where the request is still "not yet paid" and therefore subject
// to the 30-day deadline. PARTIALLY_PAID is deliberately excluded — once any
// item has been paid, money has already moved, so auto-expiry is skipped and
// the request is left for manual handling (cancel/settle) instead.
const EXPIRABLE_STATUSES = new Set(['SUBMITTED', 'APPROVED', 'PARTIALLY_APPROVED'])

type ExpiryCheckable = { status: string; submittedAt: Date | null }

export function isComboRequestExpired(request: ExpiryCheckable, now: Date = new Date()): boolean {
  if (!request.submittedAt || !EXPIRABLE_STATUSES.has(request.status)) return false
  const deadline = request.submittedAt.getTime() + COMBO_REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  return now.getTime() >= deadline
}

// Null when not applicable (DRAFT, no submittedAt, already past the
// expirable statuses, or already expired).
export function daysRemaining(request: ExpiryCheckable, now: Date = new Date()): number | null {
  if (!request.submittedAt || !EXPIRABLE_STATUSES.has(request.status)) return null
  const deadline = request.submittedAt.getTime() + COMBO_REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  const msLeft = deadline - now.getTime()
  if (msLeft <= 0) return 0
  return Math.ceil(msLeft / (24 * 60 * 60 * 1000))
}

type ExpirableRequest = {
  id: string
  accountId: string
  linkedPaymentId: string | null
}

// Shared transition used by both the lazy guards (approve/items routes) and
// the nightly sweep. Reverses the linked payment (if any, and still
// APPROVED) using the same REVERSED status the existing manual
// payments/[paymentId]/reverse endpoint uses — already excluded from
// updateExpenseAccountBalanceTx's sum, so calling that afterward correctly
// restores the balance that approval had deducted.
export async function expireComboRequestTx(tx: any, request: ExpirableRequest, now: Date = new Date()) {
  if (request.linkedPaymentId) {
    const payment = await tx.expenseAccountPayments.findUnique({
      where: { id: request.linkedPaymentId },
      select: { id: true, status: true },
    })
    if (payment && payment.status === 'APPROVED') {
      await tx.expenseAccountPayments.update({
        where: { id: payment.id },
        data: {
          status: 'REVERSED',
          reversedAt: now,
          reversalNote: 'Auto-expired: combo request not paid within 30 days of submission',
        },
      })
      // Nothing was ever disbursed, so no receipt should be expected.
      await tx.expensePaymentReceiptReviews.deleteMany({ where: { expensePaymentId: payment.id } })
      await updateExpenseAccountBalanceTx(tx, request.accountId)
    }
  }

  return tx.comboPaymentRequests.update({
    where: { id: request.id },
    data: { status: 'EXPIRED', expiredAt: now },
  })
}
