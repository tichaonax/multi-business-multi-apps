import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

/**
 * POST /api/expense-account/pending-actions/[paymentId]/approve
 * Approves a personal account REQUEST payment (cashier-assisted flow).
 * Performs a balance check, debits the account, sets status to SUBMITTED,
 * and notifies the original creator.
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
        notes: true,
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

    const amount = Number(payment.amount)
    const accountId = payment.expenseAccountId

    // Compute balance OUTSIDE the transaction to avoid aggregate timeout inside interactive tx
    const [depositsAgg, paymentsAgg] = await Promise.all([
      prisma.expenseAccountDeposits.aggregate({
        where: { expenseAccountId: accountId },
        _sum: { amount: true },
      }),
      prisma.expenseAccountPayments.aggregate({
        where: { expenseAccountId: accountId, status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] } },
        _sum: { amount: true },
      }),
    ])
    const trueBalance =
      Number(depositsAgg._sum.amount || 0) - Number(paymentsAgg._sum.amount || 0)

    if (amount > trueBalance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${trueBalance.toFixed(2)}, Required: $${amount.toFixed(2)}` },
        { status: 422 }
      )
    }

    const newBalance = trueBalance - amount

    // Only writes inside the transaction — fast, no timeout risk
    await prisma.$transaction([
      prisma.expenseAccountPayments.update({
        where: { id: paymentId },
        data: { status: 'SUBMITTED', submittedBy: user.id, submittedAt: new Date() },
      }),
      prisma.expenseAccounts.update({
        where: { id: accountId },
        data: { balance: newBalance, updatedAt: new Date() },
      }),
    ])

    // Notify the original creator
    if (payment.createdBy) {
      await emitNotification({
        userIds: [payment.createdBy],
        type: 'PAYMENT_APPROVED',
        title: '✅ Payment Request Approved',
        message: `Your payment request of $${amount.toFixed(2)} was approved by ${user.name}.`,
        linkUrl: `/expense-accounts/${accountId}/payments/${paymentId}`,
        metadata: { paymentId, accountId },
      })
    }

    return NextResponse.json({ success: true, paymentId })
  } catch (error) {
    console.error('Error approving personal payment request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve payment' },
      { status: 500 }
    )
  }
}
