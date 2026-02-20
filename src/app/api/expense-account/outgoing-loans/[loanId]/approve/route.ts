import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/expense-account/outgoing-loans/[loanId]/approve
 * Manager/admin approves an employee loan — moves PENDING_APPROVAL → PENDING_CONTRACT
 * For EMPLOYEE loans sourced from payroll account: checks payroll balance first
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
      include: {
        payrollAccount: { select: { id: true, balance: true } },
        recipientEmployee: { select: { id: true, phone: true } },
      },
    })

    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    if (loan.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: `Cannot approve loan in status: ${loan.status}` }, { status: 400 })
    }

    // Require borrower phone number on file before approval
    const borrowerPhone = (loan as any).recipientEmployee?.phone
    if (!borrowerPhone) {
      return NextResponse.json({
        error: 'Cannot approve — borrower has no phone number on file. Update the employee record first.',
      }, { status: 400 })
    }

    // For EMPLOYEE loans sourced from payroll account: check payroll balance
    if (loan.payrollAccountId && loan.payrollAccount) {
      const payrollBalance = Number(loan.payrollAccount.balance)
      const loanAmount = Number(loan.principalAmount)
      if (payrollBalance < loanAmount) {
        const shortBy = (loanAmount - payrollBalance).toFixed(2)
        return NextResponse.json({
          error: `Insufficient payroll balance — fund payroll first (short by $${shortBy})`,
        }, { status: 400 })
      }
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
