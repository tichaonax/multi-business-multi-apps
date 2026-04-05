import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

/**
 * POST /api/expense-account/[accountId]/payments/[paymentId]/cancel
 * Requester cancels a QUEUED (or legacy REQUEST) payment before EOD batches it.
 * Only the original creator or a system admin can cancel.
 * Once a payment moves to PENDING_APPROVAL it cannot be cancelled here —
 * the cashier must reject it during the EOD batch review.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string; paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, paymentId } = await params

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        expenseAccountId: true,
        status: true,
        createdBy: true,
        amount: true,
        expenseAccount: {
          select: { businessId: true, accountType: true, accountName: true },
        },
        creator: { select: { name: true } },
      },
    })

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.expenseAccountId !== accountId) {
      return NextResponse.json({ error: 'Payment does not belong to this account' }, { status: 400 })
    }

    // Only creator or system admin can cancel
    if (payment.createdBy !== user.id && !isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only the original requester or an admin can cancel this payment' },
        { status: 403 }
      )
    }

    // Only QUEUED (or legacy REQUEST) can be cancelled
    if (!['QUEUED', 'REQUEST'].includes(payment.status)) {
      return NextResponse.json(
        {
          error: `Cannot cancel a payment with status "${payment.status}". Once batched for EOD review, ask the cashier to reject it.`,
        },
        { status: 400 }
      )
    }

    const updated = await prisma.expenseAccountPayments.update({
      where: { id: paymentId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      select: { id: true, status: true, cancelledAt: true },
    })

    // For personal REQUEST payments, notify cashier grantees that the request was cancelled
    const isPersonalRequest =
      payment.status === 'REQUEST' &&
      (!payment.expenseAccount?.businessId || payment.expenseAccount?.accountType === 'PERSONAL')

    if (isPersonalRequest) {
      const grants = await prisma.expenseAccountGrants.findMany({
        where: { expenseAccountId: accountId },
        select: { userId: true },
      })
      const granteeIds = grants.map((g) => g.userId)
      if (granteeIds.length > 0) {
        const creatorName = payment.creator?.name ?? 'Someone'
        const accountName = payment.expenseAccount?.accountName ?? 'expense account'
        const amt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
          Number(payment.amount)
        )
        await emitNotification({
          userIds: granteeIds,
          type: 'PAYMENT_SUBMITTED',
          title: '🚫 Payment Request Cancelled',
          message: `${creatorName} cancelled a ${amt} payment request on ${accountName}.`,
          link: `/expense-accounts/${accountId}/payments`,
        })
      }
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error cancelling payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel payment' },
      { status: 500 }
    )
  }
}
