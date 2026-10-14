import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import { getLendingCashierUserIds } from '@/lib/loans/lending-cashiers'

/**
 * GET /api/expense-account/outgoing-loans/[loanId]/repayment-requests
 * List repayment requests (any status) for a loan.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && !permissions.canManageLending && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const requests = await prisma.accountOutgoingLoanPayments.findMany({
      where: { loanId: params.loanId },
      include: {
        recorder: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        requests: requests.map(r => ({
          id: r.id,
          amount: Number(r.amount),
          paymentDate: r.paymentDate.toISOString(),
          paymentMethod: r.paymentMethod,
          notes: r.notes,
          status: r.status,
          requestedBy: r.recorder?.name ?? null,
          approvedBy: r.approver?.name ?? null,
          approvedAt: r.approvedAt?.toISOString() ?? null,
          rejectedAt: r.rejectedAt?.toISOString() ?? null,
          rejectionReason: r.rejectionReason,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error('Error listing repayment requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/expense-account/outgoing-loans/[loanId]/repayment-requests
 * Borrower-side (MBM-312): request a repayment against an outgoing loan.
 * Creates a PENDING AccountOutgoingLoanPayments row — no money moves until
 * a cashier approves it (see [paymentId]/approve).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && !permissions.canManageLending && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { amount, paymentDate, paymentMethod = 'CASH', notes } = body

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid repayment amount' }, { status: 400 })
    }
    if (!paymentDate) {
      return NextResponse.json({ error: 'paymentDate is required' }, { status: 400 })
    }

    const loan = await prisma.accountOutgoingLoans.findUnique({
      where: { id: params.loanId },
      include: {
        recipientBusiness: { select: { name: true } },
        expenseAccount: { select: { accountName: true } },
      },
    })

    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    if (loan.loanType !== 'BUSINESS') {
      return NextResponse.json({ error: 'Repayment requests are only supported for BUSINESS loans' }, { status: 400 })
    }
    if (loan.status !== 'ACTIVE') {
      return NextResponse.json({ error: `Cannot request a repayment for a loan in status: ${loan.status}` }, { status: 400 })
    }

    const repayAmount = Number(amount)
    const remaining = Number(loan.remainingBalance)
    if (repayAmount > remaining + 0.001) {
      return NextResponse.json({
        error: `Repayment exceeds outstanding balance of $${remaining.toFixed(2)}`,
      }, { status: 400 })
    }

    const pendingRequest = await prisma.accountOutgoingLoanPayments.create({
      data: {
        loanId: loan.id,
        amount: repayAmount,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        notes: notes ?? null,
        status: 'PENDING',
        recordedBy: user.id,
      },
    })

    try {
      const cashierIds = await getLendingCashierUserIds()
      if (cashierIds.length > 0) {
        await emitNotification({
          userIds: cashierIds,
          type: 'LOAN_REPAYMENT_SUBMITTED',
          title: 'Loan repayment awaiting approval',
          message: `${loan.recipientBusiness?.name ?? 'Business'} → ${loan.expenseAccount?.accountName ?? 'account'}: $${repayAmount.toFixed(2)} (${loan.loanNumber})`,
          linkUrl: `/expense-accounts/${loan.expenseAccountId}`,
          metadata: { loanId: loan.id, loanNumber: loan.loanNumber, paymentId: pendingRequest.id },
        })
      }
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      data: { request: { id: pendingRequest.id, amount: repayAmount, status: pendingRequest.status } },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating repayment request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
