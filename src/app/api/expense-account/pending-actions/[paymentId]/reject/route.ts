import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

/**
 * POST /api/expense-account/pending-actions/[paymentId]/reject
 * Rejects a personal account REQUEST payment (cashier-assisted flow).
 * Sets status to REJECTED and notifies the original creator. No balance change.
 * Only admins or users with canSubmitPaymentBatch + a grant on the account may call this.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const permissions = getEffectivePermissions(user)
    if (!isAdmin && !permissions.canSubmitPaymentBatch) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { paymentId } = await params

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        amount: true,
        createdBy: true,
        expenseAccountId: true,
        expenseAccount: { select: { id: true, accountType: true, businessId: true } },
      },
    })

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.status !== 'REQUEST') {
      return NextResponse.json({ error: 'Payment is not in REQUEST status' }, { status: 400 })
    }

    const isPersonalAccount =
      payment.expenseAccount?.accountType === 'PERSONAL' || !payment.expenseAccount?.businessId
    if (!isPersonalAccount) {
      return NextResponse.json(
        { error: 'This route is only for personal account payment requests' },
        { status: 400 }
      )
    }

    // Non-admins must have an explicit grant on the account
    if (!isAdmin) {
      const grant = await prisma.expenseAccountGrants.findUnique({
        where: {
          expenseAccountId_userId: {
            expenseAccountId: payment.expenseAccountId,
            userId: user.id,
          },
        },
        select: { id: true },
      })
      if (!grant) {
        return NextResponse.json({ error: 'You do not have access to this expense account' }, { status: 403 })
      }
    }

    await prisma.expenseAccountPayments.update({
      where: { id: paymentId },
      data: { status: 'REJECTED', rejectedBy: user.id, rejectedAt: new Date() },
    })

    // Notify the original creator
    if (payment.createdBy) {
      await emitNotification({
        userIds: [payment.createdBy],
        type: 'PAYMENT_SUBMITTED',
        title: '❌ Payment Request Rejected',
        message: `Your payment request of $${Number(payment.amount).toFixed(2)} was rejected by ${user.name}.`,
        linkUrl: `/expense-accounts/${payment.expenseAccountId}/payments/${paymentId}`,
        metadata: { paymentId, accountId: payment.expenseAccountId },
      })
    }

    return NextResponse.json({ success: true, paymentId })
  } catch (error) {
    console.error('Error rejecting personal payment request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject payment' },
      { status: 500 }
    )
  }
}
