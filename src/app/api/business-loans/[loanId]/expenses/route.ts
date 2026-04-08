import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'

/**
 * POST /api/business-loans/[loanId]/expenses
 * Record one or more loan expenses.
 * Body: { items: [{ description, amount, expenseDate, notes? }] }
 * Access: assigned manager or admin while status is RECORDING.
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
      select: { id: true, status: true, managedByUserId: true, expenseAccountId: true },
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
        { error: 'Expenses can only be added while the loan is in RECORDING status' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const items: { description: string; amount: number; expenseDate: string; notes?: string }[] = body.items

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required and must not be empty' }, { status: 400 })
    }

    for (const [i, item] of items.entries()) {
      if (!item.description || !item.amount || !item.expenseDate) {
        return NextResponse.json({ error: `Item ${i + 1}: description, amount, and expenseDate are required` }, { status: 400 })
      }
      if (isNaN(Number(item.amount)) || Number(item.amount) <= 0) {
        return NextResponse.json({ error: `Item ${i + 1}: amount must be a positive number` }, { status: 400 })
      }
    }

    const { expenses, newBalance } = await prisma.$transaction(async (tx) => {
      const expenses = []
      for (const item of items) {
        const parsedAmount = Number(item.amount)
        const expense = await tx.businessLoanExpense.create({
          data: {
            loan: { connect: { id: loanId } },
            description: item.description,
            amount: parsedAmount,
            expenseDate: new Date(item.expenseDate),
            notes: item.notes ?? null,
            creator: { connect: { id: user.id } },
          },
        })
        if (loan.expenseAccountId) {
          await tx.expenseAccountPayments.create({
            data: {
              expenseAccountId: loan.expenseAccountId,
              paymentType: 'LOAN_EXPENSE',
              amount: parsedAmount,
              paymentDate: new Date(item.expenseDate),
              payeeType: 'OTHER',
              status: 'SUBMITTED',
              receiptNumber: expense.id,
              notes: `Loan expense: ${item.description}`,
              createdBy: user.id,
            },
          })
        }
        expenses.push(expense)
      }
      const newBalance = loan.expenseAccountId
        ? await updateExpenseAccountBalanceTx(tx, loan.expenseAccountId)
        : null
      return { expenses, newBalance }
    })

    return NextResponse.json({ expenses, newBalance, count: expenses.length }, { status: 201 })
  } catch (error) {
    console.error('POST /api/business-loans/[loanId]/expenses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
