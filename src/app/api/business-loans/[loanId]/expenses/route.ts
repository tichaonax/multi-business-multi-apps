import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'

/**
 * POST /api/business-loans/[loanId]/expenses
 * Record a new loan expense. Access: assigned user only while status is RECORDING.
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

    if (!isAdmin && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (loan.status !== 'RECORDING') {
      return NextResponse.json(
        { error: 'Expenses can only be added while the loan is in RECORDING status' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { description, amount, expenseDate, notes } = body

    if (!description || !amount || !expenseDate) {
      return NextResponse.json(
        { error: 'description, amount, and expenseDate are required' },
        { status: 400 }
      )
    }

    const parsedAmount = Number(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }

    const { expense, newBalance } = await prisma.$transaction(async (tx) => {
      const expense = await tx.businessLoanExpense.create({
        data: {
          loanId,
          description,
          amount: parsedAmount,
          expenseDate: new Date(expenseDate),
          notes: notes ?? null,
          createdByUserId: user.id,
        },
      })

      // Mirror into ExpenseAccountPayments so balance calculation stays consistent
      await tx.expenseAccountPayments.create({
        data: {
          expenseAccountId: loan.expenseAccountId,
          paymentType: 'LOAN_EXPENSE',
          amount: parsedAmount,
          paymentDate: new Date(expenseDate),
          payeeType: 'OTHER',
          status: 'SUBMITTED',
          receiptNumber: expense.id,
          description: `Loan expense: ${description}`,
          createdByUserId: user.id,
        },
      })

      const newBalance = await updateExpenseAccountBalanceTx(tx, loan.expenseAccountId)
      return { expense, newBalance }
    })

    return NextResponse.json({ expense, newBalance }, { status: 201 })
  } catch (error) {
    console.error('POST /api/business-loans/[loanId]/expenses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
