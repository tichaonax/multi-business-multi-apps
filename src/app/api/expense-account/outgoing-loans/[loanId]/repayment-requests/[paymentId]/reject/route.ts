import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

/**
 * POST /api/expense-account/outgoing-loans/[loanId]/repayment-requests/[paymentId]/reject
 * Cashier rejects a pending repayment request — no money moves.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { loanId: string; paymentId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageLending && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied — canManageLending required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const reason: string | undefined = body.reason?.trim()
    if (!reason) {
      return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })
    }

    const pending = await prisma.accountOutgoingLoanPayments.findUnique({
      where: { id: params.paymentId },
      include: { loan: { select: { id: true, loanNumber: true, expenseAccountId: true } } },
    })
    if (!pending || pending.loanId !== params.loanId) {
      return NextResponse.json({ error: 'Repayment request not found' }, { status: 404 })
    }
    if (pending.status !== 'PENDING') {
      return NextResponse.json({ error: `Cannot reject a repayment request in status: ${pending.status}` }, { status: 400 })
    }

    const updated = await prisma.accountOutgoingLoanPayments.update({
      where: { id: params.paymentId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason ?? null,
      },
    })

    try {
      await emitNotification({
        userIds: [pending.recordedBy],
        type: 'LOAN_REPAYMENT_REJECTED',
        title: 'Loan repayment rejected',
        message: `${pending.loan.loanNumber} — $${Number(pending.amount).toFixed(2)} repayment request${reason ? `: ${reason}` : ''}`,
        ...(pending.loan.expenseAccountId ? { linkUrl: `/expense-accounts/${pending.loan.expenseAccountId}?tab=lent-out` } : {}),
        metadata: { loanId: pending.loanId, loanNumber: pending.loan.loanNumber, paymentId: pending.id },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      data: { request: { id: updated.id, status: updated.status } },
    })
  } catch (error) {
    console.error('Error rejecting repayment request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
