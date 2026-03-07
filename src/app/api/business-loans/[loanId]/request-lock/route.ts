import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/business-loans/[loanId]/request-lock
 * Assigned user signals that all expenses are recorded and the account is ready to lock.
 * Access: assigned user only; loan must be in RECORDING status.
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

    const { loanId } = await params

    const loan = await prisma.businessLoan.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        status: true,
        managedByUserId: true,
        expenseAccountId: true,
      },
    })
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    const permissions = getEffectivePermissions(user)
    const isAdmin = permissions.canManageBusinessLoans
    const isAssigned = loan.managedByUserId === user.id

    // Only assigned user (or admin) can request a lock
    if (!isAdmin && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (loan.status !== 'RECORDING') {
      return NextResponse.json(
        { error: `Cannot request lock: loan is currently in '${loan.status}' status` },
        { status: 400 }
      )
    }

    // Require at least one expense before locking
    const expenseCount = await prisma.businessLoanExpense.count({ where: { loanId } })
    if (expenseCount === 0) {
      return NextResponse.json(
        { error: 'Cannot request lock: no expenses have been recorded yet' },
        { status: 400 }
      )
    }

    const updated = await prisma.businessLoan.update({
      where: { id: loanId },
      data: {
        status: 'LOCK_REQUESTED',
        lockRequestedAt: new Date(),
        lockRequestedByUserId: user.id,
      },
    })

    return NextResponse.json({ loan: updated })
  } catch (error) {
    console.error('POST /api/business-loans/[loanId]/request-lock error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
