import { prisma } from '@/lib/prisma'
import { emitGroupedNotification } from '@/lib/notifications/notification-emitter'
import { reconciliationStatus } from './receipt-reconciliation-status'
import { resolveReceiptPayeeName } from './receipt-payee-attribution'

// Cashiers aren't pulled in from day one — the requester gets a grace period
// to submit receipts before it becomes the cashiers' problem too.
const CASHIER_GRACE_DAYS = 5

export function receiptReminderGroupKey(paymentId: string): string {
  return `receipt-reminder:${paymentId}`
}

/**
 * Sweeps every ExpensePaymentReceiptReviews that isn't fully reconciled and
 * sends/refreshes a daily reminder to the requester (from day one) and to
 * every FULL-grant cashier on the account (starting 5 days after the review
 * was created, i.e. 5 days after funds were disbursed). Uses
 * emitGroupedNotification so repeated daily runs for the same payment
 * refresh one notification row per recipient instead of piling up a new one
 * every day. Called both by the nightly cron
 * (receipt-reminder-scheduler.ts) and lazily from GET /api/notifications for
 * immediacy — safe to call repeatedly, it's idempotent per day via the
 * upsert.
 */
export async function sweepOutstandingReceiptReminders(): Promise<{ payments: number; requesterReminders: number; cashierReminders: number }> {
  try {
    const outstanding = await prisma.expensePaymentReceiptReviews.findMany({
      where: { status: { in: ['PENDING', 'SUBMITTED'] } },
      select: {
        expensePaymentId: true,
        expectedAmount: true,
        status: true,
        createdAt: true,
        expensePayment: {
          select: {
            id: true,
            createdBy: true,
            payeeUserId: true,
            expenseAccountId: true,
            creator: { select: { id: true, name: true } },
            combo_request: { select: { createdBy: true, title: true, creator: { select: { name: true } } } },
            expense_payment_receipts: {
              select: {
                amount: true,
                payeeType: true,
                payeeName: true,
                payeePerson: { select: { fullName: true } },
                payeeBusiness: { select: { name: true } },
                payeeSupplier: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    let requesterReminders = 0
    let cashierReminders = 0

    for (const review of outstanding) {
      const payment = review.expensePayment
      const receiptTotal = payment.expense_payment_receipts.reduce((sum, r) => sum + Number(r.amount), 0)
      const expected = Number(review.expectedAmount)
      const status = reconciliationStatus({ expectedAmount: expected, receiptTotal, reviewStatus: review.status })
      if (status === 'FULLY_RECEIPTED') continue // shouldn't occur for PENDING/SUBMITTED, guard anyway

      const requesterId = payment.combo_request?.createdBy ?? payment.createdBy ?? payment.payeeUserId
      if (!requesterId) continue

      const requesterName = payment.combo_request ? payment.combo_request.creator?.name : payment.creator?.name
      const reference = payment.combo_request?.title ?? `payment ${payment.id.slice(0, 8)}`
      const outstandingAmount = expected - receiptTotal
      const groupKey = receiptReminderGroupKey(payment.id)
      // tab=transactions lands reliably for every user type, including
      // restricted/PERSONAL-grant requesters — the Overview tab shows a
      // different, TransactionHistory-less view for them, which would
      // silently swallow the deep-link otherwise.
      const linkUrl = `/expense-accounts/${payment.expenseAccountId}?tab=transactions&openReceiptsForPayment=${payment.id}`

      const payeeNames = [...new Set(payment.expense_payment_receipts.map((r) => resolveReceiptPayeeName(r)).filter((n): n is string => !!n))]
      const payeeNote = payeeNames.length > 0 ? ` Receipted so far to: ${payeeNames.join(', ')}.` : ''

      const title = `Receipt reconciliation needed — ${reference}`
      const message =
        `"${reference}" requested by ${requesterName ?? 'Unknown'}. ` +
        `Amount provided: $${expected.toFixed(2)}, receipts so far: $${receiptTotal.toFixed(2)}, outstanding: $${outstandingAmount.toFixed(2)}.` +
        payeeNote

      const metadata = {
        paymentId: payment.id,
        accountId: payment.expenseAccountId,
        requesterId,
        requesterName,
        reference,
        expected,
        receiptTotal,
        outstanding: outstandingAmount,
      }

      // Requester — reminded from day one.
      await emitGroupedNotification({
        userId: requesterId,
        type: 'RECEIPT_REMINDER',
        title,
        message,
        linkUrl,
        metadata,
        groupKey,
      })
      requesterReminders++

      // Cashiers — only once the review has sat unresolved for 5+ days.
      const ageDays = (Date.now() - review.createdAt.getTime()) / (24 * 60 * 60 * 1000)
      if (ageDays >= CASHIER_GRACE_DAYS) {
        const grants = await prisma.expenseAccountGrants.findMany({
          where: { expenseAccountId: payment.expenseAccountId, permissionLevel: 'FULL' },
          select: { userId: true },
        })
        for (const grant of grants) {
          if (grant.userId === requesterId) continue // already reminded above
          await emitGroupedNotification({
            userId: grant.userId,
            type: 'RECEIPT_REMINDER',
            title,
            message,
            linkUrl,
            metadata,
            groupKey,
          })
          cashierReminders++
        }
      }
    }

    return { payments: outstanding.length, requesterReminders, cashierReminders }
  } catch (err) {
    console.error('[receipt-review-notify] sweepOutstandingReceiptReminders failed:', err)
    return { payments: 0, requesterReminders: 0, cashierReminders: 0 }
  }
}

let lastLazySweepAt = 0
const MIN_LAZY_SWEEP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes — the nightly cron is the primary driver; this just catches new discrepancies sooner between runs, so it doesn't need to re-scan on every single notification-panel load.

/** Lazy trigger for GET /api/notifications — same upsert logic as the cron sweep, throttled so it isn't a full system-wide scan on every page load. */
export async function sweepOutstandingReceiptRemindersThrottled(): Promise<void> {
  if (Date.now() - lastLazySweepAt < MIN_LAZY_SWEEP_INTERVAL_MS) return
  lastLazySweepAt = Date.now()
  await sweepOutstandingReceiptReminders()
}
