import { prisma } from '@/lib/prisma'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import { isAccountCashier } from './receipt-review-access'

const ESCALATION_DAYS = 7
const LOOKBACK_DAYS = 60 // don't scan forever-old outstanding advances
const REQUESTER_REMINDER_THROTTLE_HOURS = 24 // plan Decision #4 — once/day even across multiple logins

// Lazy, request-triggered check (no cron infrastructure in this app — mirrors
// src/lib/vehicle-service/notify.ts's checkAndEscalateStaleJobs). Called from
// GET /api/notifications so it runs "each time they login" per plan Decision #7,
// scoped to whichever user is currently loading their notifications.
export async function checkAndNotifyOutstandingReceipts(userId: string): Promise<void> {
  try {
    const lookback = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)

    const outstanding = await prisma.expensePaymentReceiptReviews.findMany({
      where: {
        status: { in: ['PENDING', 'SUBMITTED'] },
        createdAt: { gt: lookback },
      },
      select: {
        id: true,
        expensePaymentId: true,
        expectedAmount: true,
        createdAt: true,
        expensePayment: {
          select: {
            id: true,
            createdBy: true,
            payeeUserId: true,
            expenseAccountId: true,
            paidAt: true,
            combo_request: { select: { createdBy: true, title: true } },
          },
        },
      },
    })
    if (outstanding.length === 0) return

    for (const review of outstanding) {
      const payment = review.expensePayment
      const requesterId = payment.combo_request?.createdBy ?? payment.createdBy ?? payment.payeeUserId
      const disbursedAt = payment.paidAt ?? review.createdAt
      const daysSince = (Date.now() - disbursedAt.getTime()) / (24 * 60 * 60 * 1000)
      const title = payment.combo_request?.title ?? 'an advance'
      const expected = Number(review.expectedAmount)

      // Requester's own daily reminder — only act if it's THIS user's outstanding item.
      if (requesterId === userId) {
        const throttleWindow = new Date(Date.now() - REQUESTER_REMINDER_THROTTLE_HOURS * 60 * 60 * 1000)
        const recentReminder = await prisma.appNotification.findFirst({
          where: {
            userId,
            type: 'RECEIPT_REMINDER',
            createdAt: { gt: throttleWindow },
            metadata: { path: ['paymentId'], equals: payment.id },
          },
          select: { id: true },
        })
        if (!recentReminder) {
          await emitNotification({
            userIds: [userId],
            type: 'RECEIPT_REMINDER',
            title: 'Receipts still outstanding',
            message: `You still need to add receipts for $${expected.toFixed(2)} from "${title}".`,
            linkUrl: `/expense-accounts/${payment.expenseAccountId}`,
            metadata: { paymentId: payment.id, accountId: payment.expenseAccountId },
          })
        }
      }

      // 7-day cashier escalation — only act if THIS user is a cashier for the
      // account, and only once ever per payment (no time window — existence check).
      if (daysSince >= ESCALATION_DAYS) {
        const alreadyEscalated = await prisma.appNotification.findFirst({
          where: {
            type: 'RECEIPT_ESCALATION',
            metadata: { path: ['paymentId'], equals: payment.id },
          },
          select: { id: true },
        })
        if (!alreadyEscalated) {
          const isCashier = await isAccountCashier(userId, false, payment.expenseAccountId)
          if (isCashier) {
            await emitNotification({
              userIds: [userId],
              type: 'RECEIPT_ESCALATION',
              title: 'Receipts overdue — 7+ days',
              message: `Receipts for "${title}" ($${expected.toFixed(2)}) are still outstanding after ${Math.floor(daysSince)} days.`,
              linkUrl: `/expense-accounts/${payment.expenseAccountId}`,
              metadata: { paymentId: payment.id, accountId: payment.expenseAccountId },
            })
          }
        }
      }
    }
  } catch (err) {
    console.error('[receipt-review-notify] checkAndNotifyOutstandingReceipts failed:', err)
  }
}
