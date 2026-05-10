import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitNotification } from '@/lib/notifications/notification-emitter'

/**
 * POST /api/business-loans/[loanId]/withdrawal-requests
 * Assigned user submits a withdrawal voucher for the current month.
 * Rules:
 *   - Loan must be LOCKED
 *   - Max one request per calendar month per loan
 *   - requestedAmount must be > 0 and <= availableToWithdraw
 * Access: loan.managedByUserId only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { loanId } = await params

    const loan = await prisma.businessLoan.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        loanNumber: true,
        status: true,
        lockedBalance: true,
        managedByUserId: true,
        expenseAccountId: true,
        expenseAccount: {
          select: { balance: true },
        },
      },
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    const isManager = loan.managedByUserId === user.id ||
      !!(await prisma.businessLoanManager.findUnique({ where: { loanId_userId: { loanId: loan.id, userId: user.id } } }))
    if (!isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (loan.status !== 'LOCKED') {
      return NextResponse.json(
        { error: `Withdrawals can only be requested when the loan is LOCKED (current status: ${loan.status})` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { requestedAmount, notes } = body

    if (!requestedAmount || isNaN(Number(requestedAmount)) || Number(requestedAmount) <= 0) {
      return NextResponse.json({ error: 'requestedAmount must be a positive number' }, { status: 400 })
    }

    const amount = Number(requestedAmount)

    // Compute availableToWithdraw
    const lockedBalance = Number(loan.lockedBalance ?? 0)
    const currentBalance = Number(loan.expenseAccount?.balance ?? 0)
    const availableToWithdraw = Math.max(0, Math.abs(lockedBalance) - Math.abs(currentBalance))

    if (availableToWithdraw <= 0) {
      return NextResponse.json(
        { error: 'Loan is fully repaid — no amount is available to withdraw' },
        { status: 422 }
      )
    }

    if (amount > availableToWithdraw) {
      return NextResponse.json(
        {
          error: `Requested amount $${amount.toFixed(2)} exceeds available to withdraw $${availableToWithdraw.toFixed(2)}`,
        },
        { status: 422 }
      )
    }

    // One request per calendar month per loan
    const requestMonth = new Date().toISOString().slice(0, 7) // "2026-03"

    const existing = await prisma.loanWithdrawalRequest.findFirst({
      where: { loanId, requestMonth },
      select: { id: true, status: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: `A withdrawal request for ${requestMonth} already exists (status: ${existing.status})` },
        { status: 409 }
      )
    }

    // Generate requestNumber: WR-{loanNumber}-{YYYYMM}
    const requestNumber = `WR-${loan.loanNumber}-${requestMonth.replace('-', '')}`

    const withdrawalRequest = await prisma.loanWithdrawalRequest.create({
      data: {
        loanId,
        requestNumber,
        requestedAmount: amount,
        requestMonth,
        status: 'PENDING',
        notes: notes ?? null,
        createdBy: user.id,
      },
    })

    // Dual notifications — admin approval + cashier heads-up (non-blocking)
    try {
      const [adminUsers, cashierUsers] = await Promise.all([
        prisma.users.findMany({
          where: { role: 'admin', isActive: true },
          select: { id: true },
        }),
        prisma.users.findMany({
          where: {
            isActive: true,
            role: { not: 'admin' },
            permissions: { path: ['canSubmitPaymentBatch'], equals: true },
          },
          select: { id: true },
        }),
      ])
      const adminIds = adminUsers.map(u => u.id)
      const cashierIds = cashierUsers.map(u => u.id).filter(id => !adminIds.includes(id) && id !== user.id)
      const notesSummary = notes?.trim() ? ` Notes: "${notes.trim()}"` : ''

      if (adminIds.length > 0) {
        await emitNotification({
          userIds: adminIds,
          type: 'WITHDRAWAL_SUBMITTED',
          title: 'New Withdrawal Request',
          message: `${user.name} requested $${amount.toFixed(2)} from loan ${loan.loanNumber}.${notesSummary}`,
          linkUrl: '/admin/loans',
          metadata: { requestId: withdrawalRequest.id, loanId, requestNumber },
        })
      }
      if (cashierIds.length > 0) {
        await emitNotification({
          userIds: cashierIds,
          type: 'WITHDRAWAL_CASHIER_ALERT',
          title: 'Withdrawal Request — Awaiting Admin Approval',
          message: `${user.name} requested $${amount.toFixed(2)} from loan ${loan.loanNumber}. Admin must approve before you can disburse.`,
          linkUrl: '/admin/pending-actions',
          metadata: { requestId: withdrawalRequest.id, loanId, requestNumber },
        })
      }
    } catch (notifErr) {
      console.error('[withdrawal] Notification error (non-blocking):', notifErr)
    }

    return NextResponse.json({ withdrawalRequest }, { status: 201 })
  } catch (error) {
    console.error('POST /api/business-loans/[loanId]/withdrawal-requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
