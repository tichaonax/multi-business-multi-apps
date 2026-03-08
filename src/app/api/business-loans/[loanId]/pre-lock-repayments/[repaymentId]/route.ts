import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'

/**
 * DELETE /api/business-loans/[loanId]/pre-lock-repayments/[repaymentId]
 * Remove a pre-lock repayment and its linked ExpenseAccountDeposits record.
 * Access: assigned user only while status is RECORDING.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ loanId: string; repaymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { loanId, repaymentId } = await params

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
    const isManager = loan.managedByUserId === user.id ||
      !!(await prisma.businessLoanManager.findUnique({ where: { loanId_userId: { loanId: loan.id, userId: user.id } } }))

    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (loan.status !== 'RECORDING') {
      return NextResponse.json(
        { error: 'Pre-lock repayments can only be deleted while the loan is in RECORDING status' },
        { status: 400 }
      )
    }

    const repayment = await prisma.businessLoanPreLockRepayment.findFirst({
      where: { id: repaymentId, loanId },
    })
    if (!repayment) {
      return NextResponse.json({ error: 'Repayment not found' }, { status: 404 })
    }

    const newBalance = await prisma.$transaction(async (tx) => {
      // Delete the mirrored deposit record (identified by manualNote = repaymentId)
      await tx.expenseAccountDeposits.deleteMany({
        where: {
          sourceType: 'LOAN_PRE_LOCK_REPAYMENT',
          manualNote: repaymentId,
          expenseAccountId: loan.expenseAccountId,
        },
      })

      await tx.businessLoanPreLockRepayment.delete({ where: { id: repaymentId } })

      return updateExpenseAccountBalanceTx(tx, loan.expenseAccountId)
    })

    return NextResponse.json({ newBalance })
  } catch (error) {
    console.error('DELETE /api/business-loans/[loanId]/pre-lock-repayments/[repaymentId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
