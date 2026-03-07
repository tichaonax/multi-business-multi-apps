import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * PUT /api/business-loans/[loanId]/withdrawal-requests/[requestId]
 * Admin actions on a withdrawal request.
 *
 * Body: { action: 'approve' | 'reject' | 'pay', approvedAmount?: number, rejectionReason?: string }
 *
 * approve → status APPROVED, snapshot approvedAmount, set approvedBy/approvedAt
 * reject  → status REJECTED, set rejectedBy/rejectedAt/rejectionReason
 * pay     → atomic tx:
 *             1. create ExpenseAccountPayments (paymentType=LOAN_WITHDRAWAL, payeeType=LOAN_LENDER)
 *             2. decrement expenseAccount.balance by approvedAmount
 *             3. update request: status=PAID, paidBy, paidAt, paymentId
 *
 * Access: admin only (canManageBusinessLoans).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ loanId: string; requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageBusinessLoans) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { loanId, requestId } = await params

    const withdrawalRequest = await prisma.loanWithdrawalRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        loanId: true,
        status: true,
        requestedAmount: true,
        approvedAmount: true,
        loan: {
          select: {
            id: true,
            status: true,
            expenseAccountId: true,
          },
        },
      },
    })

    if (!withdrawalRequest || withdrawalRequest.loanId !== loanId) {
      return NextResponse.json({ error: 'Withdrawal request not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action, approvedAmount, rejectionReason } = body

    if (!['approve', 'reject', 'pay'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve, reject, or pay' }, { status: 400 })
    }

    // ── Approve ─────────────────────────────────────────────────────────────
    if (action === 'approve') {
      if (withdrawalRequest.status !== 'PENDING') {
        return NextResponse.json(
          { error: `Cannot approve: request is currently ${withdrawalRequest.status}` },
          { status: 400 }
        )
      }

      if (!approvedAmount || isNaN(Number(approvedAmount)) || Number(approvedAmount) <= 0) {
        return NextResponse.json({ error: 'approvedAmount must be a positive number' }, { status: 400 })
      }

      const updated = await prisma.loanWithdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedAmount: Number(approvedAmount),
          approvedBy: user.id,
          approvedAt: new Date(),
        },
      })

      return NextResponse.json({ withdrawalRequest: updated })
    }

    // ── Reject ──────────────────────────────────────────────────────────────
    if (action === 'reject') {
      if (withdrawalRequest.status !== 'PENDING') {
        return NextResponse.json(
          { error: `Cannot reject: request is currently ${withdrawalRequest.status}` },
          { status: 400 }
        )
      }

      if (!rejectionReason || String(rejectionReason).trim() === '') {
        return NextResponse.json({ error: 'rejectionReason is required when rejecting' }, { status: 400 })
      }

      const updated = await prisma.loanWithdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          rejectedBy: user.id,
          rejectedAt: new Date(),
          rejectionReason: String(rejectionReason).trim(),
        },
      })

      return NextResponse.json({ withdrawalRequest: updated })
    }

    // ── Pay ──────────────────────────────────────────────────────────────────
    if (action === 'pay') {
      if (withdrawalRequest.status !== 'APPROVED') {
        return NextResponse.json(
          { error: `Cannot mark paid: request must be APPROVED first (current status: ${withdrawalRequest.status})` },
          { status: 400 }
        )
      }

      const expenseAccountId = withdrawalRequest.loan.expenseAccountId
      if (!expenseAccountId) {
        return NextResponse.json({ error: 'Loan has no expense account' }, { status: 400 })
      }

      const payAmount = Number(withdrawalRequest.approvedAmount)

      // Atomic transaction: create payment + decrement balance + update request
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Create ExpenseAccountPayments record
        const payment = await tx.expenseAccountPayments.create({
          data: {
            expenseAccountId,
            payeeType: 'LOAN_LENDER',
            amount: payAmount,
            paymentDate: new Date(),
            paymentType: 'LOAN_WITHDRAWAL',
            createdBy: user.id,
            status: 'SUBMITTED',
            isFullPayment: true,
          },
        })

        // 2. Decrement the expense account balance (withdrawal drives balance more negative)
        await tx.expenseAccounts.update({
          where: { id: expenseAccountId },
          data: {
            balance: {
              decrement: payAmount,
            },
          },
        })

        // 3. Mark request as PAID with payment reference
        const updatedRequest = await tx.loanWithdrawalRequest.update({
          where: { id: requestId },
          data: {
            status: 'PAID',
            paidBy: user.id,
            paidAt: new Date(),
            paymentId: payment.id,
          },
        })

        return { payment, withdrawalRequest: updatedRequest }
      })

      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('PUT /api/business-loans/[loanId]/withdrawal-requests/[requestId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
