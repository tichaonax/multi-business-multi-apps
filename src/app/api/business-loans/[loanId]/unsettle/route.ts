import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/business-loans/[loanId]/unsettle
 * Admin-only: Reverses an accidental SETTLED status back to LOCKED.
 * Clears settledAt so the loan resumes normal EOD repayment tracking.
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
      select: { id: true, status: true },
    })
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    if (loan.status !== 'SETTLED') {
      return NextResponse.json(
        { error: `Cannot un-settle: loan is currently in '${loan.status}' status` },
        { status: 400 }
      )
    }

    const updated = await prisma.businessLoan.update({
      where: { id: loanId },
      data: {
        status: 'LOCKED',
        settledAt: null,
      },
    })

    return NextResponse.json({ loan: updated })
  } catch (error) {
    console.error('POST /api/business-loans/[loanId]/unsettle error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
