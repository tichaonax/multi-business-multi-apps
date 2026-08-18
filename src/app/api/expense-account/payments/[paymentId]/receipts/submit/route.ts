import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import { getAccountCashierIds } from '@/lib/expense-account/receipt-review-access'
import { createAuditLog } from '@/lib/audit'

/**
 * POST /api/expense-account/payments/[paymentId]/receipts/submit
 * Requester submits their captured receipts to the cashier for review (MBM-271).
 * Allowed even if the receipt total doesn't match the expected amount — this
 * is a warning surfaced to the caller, not a block; the cashier is the actual
 * verification gate (see plan Decision #5).
 */
export async function POST(
  _request: NextRequest,
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
        createdBy: true,
        payeeUserId: true,
        expenseAccountId: true,
        expense_payment_receipts: { select: { amount: true } },
        receipt_review: { select: { id: true, status: true, expectedAmount: true } },
        combo_request: { select: { id: true, createdBy: true, title: true } },
      },
    })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (!payment.receipt_review) {
      return NextResponse.json({ error: 'This payment does not require receipt review' }, { status: 400 })
    }

    // Only the person who has to account for the funds may submit — the combo
    // request's requester, whoever created the payment, or (for USER-type
    // payees) the payee themselves — plus admin.
    const isAuthorized =
      user.role === 'admin' ||
      user.id === payment.createdBy ||
      user.id === payment.payeeUserId ||
      user.id === payment.combo_request?.createdBy
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Only the requester can submit these receipts' }, { status: 403 })
    }

    if (payment.receipt_review.status === 'APPROVED') {
      return NextResponse.json({ error: 'Receipts for this payment are already approved' }, { status: 400 })
    }

    const receiptTotal = payment.expense_payment_receipts.reduce((sum, r) => sum + Number(r.amount), 0)
    const expected = Number(payment.receipt_review.expectedAmount)
    const mismatch = Math.abs(receiptTotal - expected) > 0.01

    const now = new Date()
    await prisma.expensePaymentReceiptReviews.update({
      where: { id: payment.receipt_review.id },
      data: { status: 'SUBMITTED', submittedBy: user.id, submittedAt: now },
    })

    await createAuditLog({
      userId: user.id,
      action: 'RECEIPT_SUBMITTED',
      entityType: 'ExpensePaymentReceipt',
      entityId: payment.receipt_review.id,
      newValues: { receiptTotal, expected, status: 'SUBMITTED' },
      metadata: { paymentId, accountId: payment.expenseAccountId, mismatch },
    }).catch(err => console.error('[receipts/submit] audit log error (non-blocking):', err))

    try {
      const cashierIds = (await getAccountCashierIds(payment.expenseAccountId)).filter(id => id !== user.id)
      if (cashierIds.length > 0) {
        await emitNotification({
          userIds: cashierIds,
          type: 'RECEIPT_REMINDER',
          title: 'Receipts submitted for review',
          message: `${user.name} submitted receipts totalling $${receiptTotal.toFixed(2)} (expected $${expected.toFixed(2)})${mismatch ? ' — amounts do not match' : ''}.`,
          linkUrl: `/expense-accounts/${payment.expenseAccountId}`,
          metadata: { paymentId, accountId: payment.expenseAccountId },
        })
      }
    } catch (notifErr) {
      console.error('[receipts/submit] notification error (non-blocking):', notifErr)
    }

    return NextResponse.json({ success: true, data: { receiptTotal, expected, mismatch } })
  } catch (error) {
    console.error('Error submitting receipts:', error)
    return NextResponse.json({ error: 'Failed to submit receipts' }, { status: 500 })
  }
}
