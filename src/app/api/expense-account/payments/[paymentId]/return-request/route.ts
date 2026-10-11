import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getAccountCashierIds } from '@/lib/expense-account/receipt-review-access'
import { emitGroupedNotification, clearGroupedNotifications } from '@/lib/notifications/notification-emitter'
import { receiptReminderGroupKey } from '@/lib/expense-account/receipt-review-notify'
import { returnConfirmGroupKey } from '@/lib/expense-account/payment-return'

/**
 * POST /api/expense-account/payments/[paymentId]/return-request
 * Requester submits the amount of unused funds being returned. Does NOT
 * credit the account — stays pending until a cashier confirms receipt
 * (return-confirm). Available even if the payment was later cancelled, as
 * long as there's still a positive remaining (unreceipted) balance.
 *
 * Body: { amount, note? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { paymentId } = await params

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        expenseAccountId: true,
        createdBy: true,
        payeeUserId: true,
        locked: true,
        returnConfirmedAt: true,
        notes: true,
        combo_request: { select: { createdBy: true } },
        expense_payment_receipts: { select: { amount: true } },
      },
    })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    // Combo-linked payments go through their own settle-request flow
    // (POST /api/expense-account/[accountId]/combo-requests/[requestId]/settle-request)
    // — this endpoint is for standalone/advance payments only.
    if (payment.combo_request) {
      return NextResponse.json({ error: 'This is a combo-request payment — use its own Request Settlement action' }, { status: 400 })
    }

    const isAdmin = user.role === 'admin'
    const isRequester = user.id === payment.createdBy || user.id === payment.payeeUserId
    if (!isAdmin && !isRequester) {
      return NextResponse.json({ error: 'Only the requester can submit a return of unused funds' }, { status: 403 })
    }

    if (payment.locked) {
      return NextResponse.json({ error: 'This expense is read-only — unused funds have already been returned and confirmed' }, { status: 400 })
    }
    if (payment.returnConfirmedAt) {
      return NextResponse.json({ error: 'A return has already been confirmed for this expense' }, { status: 400 })
    }

    const receiptTotal = payment.expense_payment_receipts.reduce((sum, r) => sum + Number(r.amount), 0)
    const remaining = Number(payment.amount) - receiptTotal

    const body = await request.json().catch(() => ({}))
    const amount = Number(body.amount)
    const note = typeof body.note === 'string' ? body.note.trim() || null : null

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'A positive return amount is required' }, { status: 400 })
    }
    if (amount > remaining + 0.01) {
      return NextResponse.json({ error: `Return amount ($${amount.toFixed(2)}) cannot exceed the remaining balance ($${remaining.toFixed(2)})` }, { status: 400 })
    }

    const now = new Date()
    await prisma.expenseAccountPayments.update({
      where: { id: paymentId },
      data: {
        returnRequestedAmount: amount,
        returnRequestedAt: now,
        returnRequestedBy: user.id,
        returnNote: note,
      },
    })

    // A return request satisfies the "submit receipts or return unused
    // funds" reminder — clear it for everyone it was sent to (requester +
    // any escalated cashiers). A separate, distinct notification below asks
    // the cashier to confirm receipt.
    await clearGroupedNotifications(receiptReminderGroupKey(paymentId))

    const cashierIds = (await getAccountCashierIds(payment.expenseAccountId)).filter(id => id !== user.id)
    const groupKey = returnConfirmGroupKey(paymentId)
    const reference = payment.notes || `payment ${paymentId.slice(0, 8)}`
    const title = 'Unused funds awaiting receipt confirmation'
    const message = `${user.name} is returning $${amount.toFixed(2)} in unused funds for "${reference}".${note ? ` Note: ${note}` : ''}`
    const linkUrl = `/expense-accounts/${payment.expenseAccountId}?tab=transactions&openReceiptsForPayment=${paymentId}`

    for (const cashierId of cashierIds) {
      await emitGroupedNotification({
        userId: cashierId,
        type: 'PAYMENT_RETURN_REQUESTED',
        title,
        message,
        linkUrl,
        metadata: { paymentId, accountId: payment.expenseAccountId, amount },
        groupKey,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting return request:', error)
    return NextResponse.json({ error: 'Failed to submit return request' }, { status: 500 })
  }
}
