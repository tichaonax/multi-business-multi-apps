import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'

/**
 * POST /api/expense-account/[accountId]/payments/direct-approve
 * Per-payment approve/reject for standalone expense accounts (businessId = null).
 * Approved payments → APPROVED (requester then marks as Paid to debit balance).
 * Rejected payments → QUEUED (re-enter queue to appear in pending actions again).
 * Only admins or users with canSubmitPaymentBatch permission may call this.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const permissions = getEffectivePermissions(user)
    if (!isAdmin && !permissions.canSubmitPaymentBatch) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { accountId } = await params

    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
      select: { id: true, businessId: true, accountType: true },
    })

    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    // Only redirect to batch flow for actual business-operational accounts.
    // Personal/family accounts may have a businessId for grouping but use direct-approve.
    const isPersonalAccount = !account.businessId || account.accountType === 'PERSONAL'
    if (!isPersonalAccount) {
      return NextResponse.json(
        { error: 'This account is linked to a business — use the standard batch review flow instead.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { approvedPaymentIds = [], rejectedPaymentIds = [] } = body as {
      approvedPaymentIds: string[]
      rejectedPaymentIds: string[]
    }

    if (approvedPaymentIds.length === 0 && rejectedPaymentIds.length === 0) {
      return NextResponse.json({ error: 'No payment decisions provided' }, { status: 400 })
    }

    // REQUEST-status payments must go through /pending-actions/[paymentId]/approve — never here.
    const allIds = [...approvedPaymentIds, ...rejectedPaymentIds]
    if (allIds.length > 0) {
      const requestPayments = await prisma.expenseAccountPayments.findMany({
        where: { id: { in: allIds }, status: 'REQUEST' },
        select: { id: true },
      })
      if (requestPayments.length > 0) {
        return NextResponse.json(
          { error: 'REQUEST-status payments must be approved via the personal payment requests flow.' },
          { status: 400 }
        )
      }
    }

    await prisma.$transaction(async (tx: any) => {
      if (approvedPaymentIds.length > 0) {
        await tx.expenseAccountPayments.updateMany({
          where: { id: { in: approvedPaymentIds }, expenseAccountId: accountId },
          data: { status: 'APPROVED' },
        })
      }
      if (rejectedPaymentIds.length > 0) {
        // Rejected → back to QUEUED so they re-appear in pending actions
        await tx.expenseAccountPayments.updateMany({
          where: { id: { in: rejectedPaymentIds }, expenseAccountId: accountId },
          data: { status: 'QUEUED' },
        })
      }
      // Recalculate balance: APPROVED is not counted (only PAID + SUBMITTED are),
      // so if any payment was SUBMITTED, the balance is freed back up here and
      // will only be re-debited when the requester marks the payment as PAID.
      await updateExpenseAccountBalanceTx(tx, accountId)
    })

    // Notify each requester of approved payments so they can mark as paid
    if (approvedPaymentIds.length > 0) {
      const approvedPayments = await prisma.expenseAccountPayments.findMany({
        where: { id: { in: approvedPaymentIds } },
        select: { id: true, createdBy: true, amount: true },
      })
      for (const pmt of approvedPayments) {
        if (pmt.createdBy) {
          await emitNotification({
            userIds: [pmt.createdBy],
            type: 'PAYMENT_APPROVED',
            title: 'Payment Request Approved — Action Required',
            message: `Your payment request of $${Number(pmt.amount).toFixed(2)} has been approved. Please mark it as paid once the payment has been made.`,
            linkUrl: `/expense-accounts/${accountId}/payments/${pmt.id}`,
            metadata: { paymentId: pmt.id, accountId },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      approvedCount: approvedPaymentIds.length,
      rejectedCount: rejectedPaymentIds.length,
    })
  } catch (error) {
    console.error('Error processing payment decisions:', error)
    return NextResponse.json({ error: 'Failed to process decisions' }, { status: 500 })
  }
}
