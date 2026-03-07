import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { calculateExpenseAccountBalance } from '@/lib/expense-account-utils'

/**
 * POST /api/business-loans/[loanId]/approve-lock
 * Admin approves the lock request. Snapshots the current balance as lockedBalance.
 * After this point, EOD auto-deposits will begin repaying the loan.
 * Access: admin only (canManageBusinessLoans).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
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

    const { loanId } = await params

    const loan = await prisma.businessLoan.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        status: true,
        expenseAccountId: true,
      },
    })
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    if (loan.status !== 'LOCK_REQUESTED') {
      return NextResponse.json(
        { error: `Cannot approve lock: loan is currently in '${loan.status}' status` },
        { status: 400 }
      )
    }

    // Snapshot the balance at lock time
    const lockedBalance = await calculateExpenseAccountBalance(loan.expenseAccountId)

    const updated = await prisma.businessLoan.update({
      where: { id: loanId },
      data: {
        status: 'LOCKED',
        lockedBalance,
        lockedAt: new Date(),
        lockedByUserId: user.id,
      },
    })

    return NextResponse.json({ loan: updated, lockedBalance })
  } catch (error) {
    console.error('POST /api/business-loans/[loanId]/approve-lock error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
