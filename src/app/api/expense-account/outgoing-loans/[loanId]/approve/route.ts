import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/expense-account/outgoing-loans/[loanId]/approve
 * Manager/admin approves an employee loan — moves PENDING_APPROVAL → PENDING_CONTRACT
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

    const loan = await prisma.accountOutgoingLoans.findUnique({
      where: { id: params.loanId },
    })

    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    if (loan.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: `Cannot approve loan in status: ${loan.status}` }, { status: 400 })
    }

    // Find the approver's employee record if they have one
    const employeeRecord = await prisma.employees.findFirst({
      where: { userId: user.id },
      select: { id: true },
    })

    const updated = await prisma.accountOutgoingLoans.update({
      where: { id: params.loanId },
      data: {
        status: 'PENDING_CONTRACT',
        approvedByEmployeeId: employeeRecord?.id ?? null,
        approvedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: { loan: { id: updated.id, status: updated.status } },
    })
  } catch (error) {
    console.error('Error approving loan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
