import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import { isAccountCashier } from '@/lib/expense-account/receipt-review-access'
import { createAuditLog } from '@/lib/audit'

/**
 * POST /api/expense-account/payments/[paymentId]/receipts/approve
 * Cashier signs off on a submitted receipt set (MBM-271). Turns the badge
 * green and stops reminders/escalation. Body: { reviewNote?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { paymentId } = await params
    const body = await request.json().catch(() => ({}))
    const reviewNote: string | undefined = body?.reviewNote

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        expenseAccountId: true,
        createdBy: true,
        payeeUserId: true,
        expense_payment_receipts: { select: { amount: true } },
        receipt_review: { select: { id: true, status: true, expectedAmount: true } },
      },
    })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (!payment.receipt_review) {
      return NextResponse.json({ error: 'This payment does not require receipt review' }, { status: 400 })
    }

    const isCashier = await isAccountCashier(user.id, user.role === 'admin', payment.expenseAccountId)
    if (!isCashier) {
      return NextResponse.json({ error: 'Only a cashier for this account can approve receipts' }, { status: 403 })
    }

    if (payment.receipt_review.status === 'PENDING') {
      return NextResponse.json({ error: 'Receipts have not been submitted yet' }, { status: 400 })
    }

    const now = new Date()
    await prisma.expensePaymentReceiptReviews.update({
      where: { id: payment.receipt_review.id },
      data: { status: 'APPROVED', reviewedBy: user.id, reviewedAt: now, reviewNote: reviewNote ?? null },
    })

    const receiptTotal = payment.expense_payment_receipts.reduce((sum, r) => sum + Number(r.amount), 0)

    await createAuditLog({
      userId: user.id,
      action: 'RECEIPT_APPROVED',
      entityType: 'ExpensePaymentReceipt',
      entityId: payment.receipt_review.id,
      newValues: { status: 'APPROVED', receiptTotal, reviewNote: reviewNote ?? null },
      metadata: { paymentId, accountId: payment.expenseAccountId },
    }).catch(err => console.error('[receipts/approve] audit log error (non-blocking):', err))

    // Let the requester know it's signed off (non-blocking)
    try {
      const requesterId = payment.createdBy !== user.id ? payment.createdBy : payment.payeeUserId
      if (requesterId && requesterId !== user.id) {
        await emitNotification({
          userIds: [requesterId],
          type: 'RECEIPT_REMINDER',
          title: 'Receipts approved',
          message: `Your receipts have been reviewed and approved by ${user.name}.`,
          linkUrl: `/expense-accounts/${payment.expenseAccountId}`,
          metadata: { paymentId, accountId: payment.expenseAccountId },
        })
      }
    } catch (notifErr) {
      console.error('[receipts/approve] notification error (non-blocking):', notifErr)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error approving receipts:', error)
    return NextResponse.json({ error: 'Failed to approve receipts' }, { status: 500 })
  }
}
