/**
 * MBM-324 — settle a combo request when its whole payment is marked paid from
 * the expense account (requester "✓ Mark as Paid" / cashier EcoCash "Mark as
 * Sent"), or found already paid by the expiry check.
 *
 * Without this, only per-item Mark Paid inside the request moved the request,
 * its items and the recorded restaurant expenses to PAID — the account-level
 * action left them APPROVED, and the 30-day expiry could later release
 * recorded restaurant purchases back to unpaid.
 *
 * Kept free of `next/server` (reached from combo-request-expiry.ts, which
 * server.ts loads at startup — see MBM-320/321).
 */
import { prisma } from '@/lib/prisma'
import { applyComboItemPaymentTx } from '@/lib/restaurant-expense-combo'
import { emitNotification } from '@/lib/notifications/notification-emitter'

const SETTLEABLE_STATUSES = ['APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_PAID']

export type SettledComboRequest = {
  id: string
  accountId: string
  title: string
  createdBy: string
  expectedAmount: number
  paymentId: string
}

/**
 * Every funded, still-unpaid item is marked paid at its approved amount (no
 * approved amount = estimated), exactly as if the requester had clicked Mark
 * Paid on each without changing the amount; not-funded ($0) items are left
 * alone. The request moves to PAID. Returns the request settled, or null if
 * the payment isn't a combo payment awaiting payment.
 */
export async function settleComboRequestForPaymentTx(tx: any, paymentId: string, paidAt: Date): Promise<SettledComboRequest | null> {
  const request = await tx.comboPaymentRequests.findFirst({
    where: { linkedPaymentId: paymentId, status: { in: SETTLEABLE_STATUSES } },
    include: { items: true },
  })
  if (!request) return null

  for (const item of request.items) {
    if (item.isPaid) continue
    if (item.approvedAmount !== null && Number(item.approvedAmount) === 0) continue // not funded
    const amount = item.approvedAmount !== null ? Number(item.approvedAmount) : Number(item.estimatedAmount ?? 0)
    await tx.comboPaymentRequestItems.update({
      where: { id: item.id },
      data: { isPaid: true, paidAt, paidAmount: amount },
    })
    await applyComboItemPaymentTx(tx, item.id, amount, paidAt)
  }

  await tx.comboPaymentRequests.update({
    where: { id: request.id },
    data: { status: 'PAID', paidAt },
  })

  // Same receipt-accountability row the per-item path ensures (normally
  // already created at approval — update: {} is a deliberate no-op).
  const expectedAmount = request.approvedAmount ?? request.requestedAmount
  await tx.expensePaymentReceiptReviews.upsert({
    where: { expensePaymentId: paymentId },
    create: { expensePaymentId: paymentId, expectedAmount },
    update: {},
  })

  return {
    id: request.id,
    accountId: request.accountId,
    title: request.title,
    createdBy: request.createdBy,
    expectedAmount: Number(expectedAmount),
    paymentId,
  }
}

/** After commit: the same notifications the per-item path sends when the last
 * item is paid (cashiers: ready for sign-off; requester: add receipts).
 * Non-blocking. */
export async function notifyComboRequestSettled(settled: SettledComboRequest, actorId: string): Promise<void> {
  const linkUrl = `/expense-accounts/${settled.accountId}/combo-requests/${settled.id}`
  try {
    const grants = await prisma.expenseAccountGrants.findMany({
      where: { expenseAccountId: settled.accountId, permissionLevel: 'FULL' },
      select: { userId: true },
    })
    const cashierIds = grants.map(g => g.userId).filter(id => id !== actorId)
    if (cashierIds.length > 0) {
      await emitNotification({
        userIds: cashierIds,
        type: 'COMBO_REQUEST_PAID',
        title: 'Combo Request Fully Settled',
        message: `"${settled.title}" has been paid — ready for sign-off`,
        linkUrl,
      })
    }
    await emitNotification({
      userIds: [settled.createdBy],
      type: 'RECEIPT_REMINDER',
      title: 'Add receipts for your combo request',
      message: `You received $${settled.expectedAmount.toFixed(2)} for "${settled.title}" — add receipts to account for it.`,
      linkUrl: `/expense-accounts/${settled.accountId}`,
      metadata: { paymentId: settled.paymentId, accountId: settled.accountId },
    })
  } catch (err) {
    console.error('[combo-request-settle] notification error (non-blocking):', err)
  }
}
