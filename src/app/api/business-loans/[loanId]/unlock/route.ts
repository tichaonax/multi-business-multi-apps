import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/business-loans/[loanId]/unlock
 * Admin-only: Reverses an accidental LOCKED status back to RECORDING.
 * Only allowed when the loan has no withdrawal requests (no transactions since lock).
 * Clears lockedAt, lockedBy, lockedBalance so the loan resumes normal recording.
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
        _count: { select: { withdrawalRequests: true } },
      },
    })
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    if (loan.status !== 'LOCKED') {
      return NextResponse.json(
        { error: `Cannot un-lock: loan is currently in '${loan.status}' status` },
        { status: 400 }
      )
    }

    if (loan._count.withdrawalRequests > 0) {
      return NextResponse.json(
        { error: 'Cannot un-lock: loan has withdrawal requests. Contact support to resolve.' },
        { status: 400 }
      )
    }

    const updated = await prisma.businessLoan.update({
      where: { id: loanId },
      data: {
        status: 'RECORDING',
        lockedAt: null,
        lockedBy: null,
        lockedBalance: null,
      },
    })

    return NextResponse.json({ loan: updated })
  } catch (error) {
    console.error('POST /api/business-loans/[loanId]/unlock error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
