import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'

/**
 * DELETE /api/business-loans/[loanId]/expenses/[expenseId]
 * Remove a loan expense and its linked ExpenseAccountPayments record.
 * Access: assigned user only while status is RECORDING.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ loanId: string; expenseId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { loanId, expenseId } = await params

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
        { error: 'Expenses can only be deleted while the loan is in RECORDING status' },
        { status: 400 }
      )
    }

    const expense = await prisma.businessLoanExpense.findFirst({
      where: { id: expenseId, loanId },
    })
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const newBalance = await prisma.$transaction(async (tx) => {
      // Delete the mirrored payment record first (foreign-key safe order)
      if (loan.expenseAccountId) {
        await tx.expenseAccountPayments.deleteMany({
          where: {
            paymentType: 'LOAN_EXPENSE',
            receiptNumber: expenseId,
            expenseAccountId: loan.expenseAccountId,
          },
        })
      }

      await tx.businessLoanExpense.delete({ where: { id: expenseId } })

      return loan.expenseAccountId
        ? updateExpenseAccountBalanceTx(tx, loan.expenseAccountId)
        : null
    })

    return NextResponse.json({ newBalance })
  } catch (error) {
    console.error('DELETE /api/business-loans/[loanId]/expenses/[expenseId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
