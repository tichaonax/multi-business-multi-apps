import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'

/**
 * POST /api/expense-account/[accountId]/payments/[paymentId]/submit
 * Requester confirms the physical handover has taken place for an APPROVED payment.
 * Transitions: APPROVED → SUBMITTED
 * Only the original creator or a system admin can submit.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, paymentId } = await params
    const body = await request.json().catch(() => ({}))
    const notes: string | undefined = body?.notes?.trim() || undefined

    // Optional payee fields — provided when the payment was created without a payee
    // (cashier-approval / REQUEST flow) and the requester is now confirming the handover.
    const incomingPayeeType: string | undefined = body?.payeeType || undefined
    const incomingPayeeName: string | undefined = body?.payeeName || undefined
    const incomingPayeeUserId: string | undefined = body?.payeeUserId || undefined
    const incomingPayeeEmployeeId: string | undefined = body?.payeeEmployeeId || undefined
    const incomingPayeePersonId: string | undefined = body?.payeePersonId || undefined
    const incomingPayeeBusinessId: string | undefined = body?.payeeBusinessId || undefined
    const incomingPayeeSupplierId: string | undefined = body?.payeeSupplierId || undefined

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        expenseAccountId: true,
        status: true,
        createdBy: true,
        amount: true,
        paymentChannel: true,
        payeeType: true,
      },
    })

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.expenseAccountId !== accountId) {
      return NextResponse.json({ error: 'Payment does not belong to this account' }, { status: 400 })
    }

    // Only creator or system admin can submit
    if (payment.createdBy !== user.id && !isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only the original requester or an admin can confirm this payment' },
        { status: 403 }
      )
    }

    if (payment.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Payment must be in APPROVED status to submit. Current status: ${payment.status}` },
        { status: 400 }
      )
    }

    // EcoCash payments are confirmed by the cashier via PATCH markPaid (requires transaction code)
    if ((payment as any).paymentChannel === 'ECOCASH') {
      return NextResponse.json(
        { error: 'EcoCash payments must be confirmed by the cashier using the "Mark as Sent" action with a transaction code.' },
        { status: 400 }
      )
    }

    // If the payment was created without a payee (REQUEST flow), a payee must be provided now
    const hasExistingPayee = payment.payeeType && payment.payeeType !== 'NONE'
    const hasIncomingPayee = incomingPayeeType && incomingPayeeType !== 'NONE'
    if (!hasExistingPayee && !hasIncomingPayee) {
      return NextResponse.json(
        { error: 'A payee is required to mark this payment as paid.' },
        { status: 400 }
      )
    }

    const payeeUpdate = hasIncomingPayee ? {
      payeeType: incomingPayeeType,
      payeeName: incomingPayeeName,
      payeeUserId: incomingPayeeUserId ?? null,
      payeeEmployeeId: incomingPayeeEmployeeId ?? null,
      payeePersonId: incomingPayeePersonId ?? null,
      payeeBusinessId: incomingPayeeBusinessId ?? null,
      payeeSupplierId: incomingPayeeSupplierId ?? null,
    } : {}

    const now = new Date()
    const updated = await prisma.$transaction(async (tx: any) => {
      const p = await tx.expenseAccountPayments.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          paidAt: now,
          submittedBy: user.id,
          submittedAt: now,
          ...(notes ? { notes } : {}),
          ...payeeUpdate,
        },
        select: { id: true, status: true, paidAt: true, submittedAt: true, submittedBy: true },
      })
      await updateExpenseAccountBalanceTx(tx, accountId)
      return p
    })

    // Propagate PAID status to linked supplier payment request (non-blocking)
    prisma.supplierPaymentRequests.updateMany({
      where: { linkedPaymentId: paymentId, status: { in: ['QUEUED', 'APPROVED'] } },
      data: { status: 'PAID' },
    }).catch(() => { /* non-critical */ })

    // Clear any unread PAYMENT_APPROVED / PAYMENT_REJECTED notifications for this user
    // now that they have actioned the payment (non-critical — fire and forget)
    prisma.appNotification.deleteMany({
      where: {
        userId: payment.createdBy,
        type: { in: ['PAYMENT_APPROVED', 'PAYMENT_REJECTED'] },
        isRead: false,
      },
    }).catch(() => { /* non-critical */ })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error submitting payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit payment' },
      { status: 500 }
    )
  }
}
