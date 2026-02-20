import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/expense-account/outgoing-loans/[loanId]/reject
 * Manager/admin rejects a pending loan — moves PENDING_APPROVAL → REJECTED
 *
 * Body:
 * - reason?: string  (optional rejection reason stored on the loan)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageLending && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied — canManageLending required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { reason } = body

    const loan = await prisma.accountOutgoingLoans.findUnique({
      where: { id: params.loanId },
    })

    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

    if (loan.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: `Cannot reject a loan in status: ${loan.status}` },
        { status: 400 }
      )
    }

    const updated = await prisma.accountOutgoingLoans.update({
      where: { id: params.loanId },
      data: {
        status: 'REJECTED',
        notes: reason
          ? `Rejected: ${reason}`
          : loan.notes
            ? `${loan.notes}\nRejected by manager`
            : 'Rejected by manager',
      },
    })

    return NextResponse.json({
      success: true,
      data: { loan: { id: updated.id, status: updated.status } },
    })
  } catch (error) {
    console.error('Error rejecting loan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
