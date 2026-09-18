import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx, calculateExpenseAccountBalance } from '@/lib/expense-account-utils'

/**
 * POST /api/business-loans/[loanId]/pre-lock-repayments
 * Record one or more pre-lock repayments.
 * Body: { items: [{ description, amount, repaymentDate, notes? }] }
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
      select: {
        id: true, status: true, managedByUserId: true, expenseAccountId: true,
        expenseAccount: { select: { businessId: true } },
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
        { error: 'Pre-lock repayments can only be added while the loan is in RECORDING status' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const items: { description: string; amount: number; repaymentDate: string; notes?: string }[] = body.items

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required and must not be empty' }, { status: 400 })
    }

    for (const [i, item] of items.entries()) {
      if (!item.description || !item.amount || !item.repaymentDate) {
        return NextResponse.json({ error: `Item ${i + 1}: description, amount, and repaymentDate are required` }, { status: 400 })
      }
      if (isNaN(Number(item.amount)) || Number(item.amount) <= 0) {
        return NextResponse.json({ error: `Item ${i + 1}: amount must be a positive number` }, { status: 400 })
      }
    }

    const totalRepayment = items.reduce((sum, item) => sum + Number(item.amount), 0)
    if (loan.expenseAccountId) {
      const currentBalance = await calculateExpenseAccountBalance(loan.expenseAccountId)
      if (currentBalance + totalRepayment > 0) {
        return NextResponse.json(
          {
            error: 'Total repayment would exceed the current outstanding balance',
            currentBalance,
            maxRepayment: Math.abs(currentBalance),
          },
          { status: 400 }
        )
      }
    }

    // Real-cash check: this is a separate concern from the outstanding-balance
    // check above (that one is a BUDGET check — is the loan liability this
    // large; this one is a LIQUIDITY check — does the business actually have
    // this much real cash on hand right now to hand to the lender). This
    // route records a repayment directly (no further approval/paid stage),
    // so this is the only point where that can be checked.
    const businessId = loan.expenseAccount?.businessId ?? null
    if (businessId) {
      const bucketAgg = await prisma.cashBucketEntry.groupBy({
        by: ['direction'],
        where: { businessId, paymentChannel: 'CASH' },
        _sum: { amount: true },
      })
      const cashInflow = Number(bucketAgg.find((r: any) => r.direction === 'INFLOW')?._sum?.amount ?? 0)
      const cashOutflow = Number(bucketAgg.find((r: any) => r.direction === 'OUTFLOW')?._sum?.amount ?? 0)
      const cashBalance = cashInflow - cashOutflow
      if (cashBalance < totalRepayment) {
        return NextResponse.json(
          { error: `Insufficient cash on hand to make this repayment. Available: $${cashBalance.toFixed(2)}, Required: $${totalRepayment.toFixed(2)}.` },
          { status: 400 }
        )
      }
    }

    const { repayments, newBalance } = await prisma.$transaction(async (tx) => {
      const repayments = []
      for (const item of items) {
        const parsedAmount = Number(item.amount)
        const repayment = await tx.businessLoanPreLockRepayment.create({
          data: {
            loan: { connect: { id: loanId } },
            description: item.description,
            amount: parsedAmount,
            repaymentDate: new Date(item.repaymentDate),
            notes: item.notes ?? null,
            creator: { connect: { id: user.id } },
          },
        })
        if (loan.expenseAccountId) {
          await tx.expenseAccountDeposits.create({
            data: {
              expenseAccountId: loan.expenseAccountId,
              sourceType: 'LOAN_PRE_LOCK_REPAYMENT',
              amount: parsedAmount,
              depositDate: new Date(item.repaymentDate),
              manualNote: repayment.id,
              autoGeneratedNote: 'Pre-lock loan repayment',
              createdBy: user.id,
            },
          })
        }
        if (businessId) {
          await tx.cashBucketEntry.create({
            data: {
              businessId,
              entryType: 'PAYMENT_APPROVAL',
              direction: 'OUTFLOW',
              amount: parsedAmount,
              paymentChannel: 'CASH',
              referenceType: 'LOAN_PRE_LOCK_REPAYMENT',
              referenceId: repayment.id,
              notes: `Pre-lock loan repayment — ${item.description}`,
              entryDate: new Date(item.repaymentDate),
              createdBy: user.id,
            },
          })
        }
        repayments.push(repayment)
      }
      const newBalance = loan.expenseAccountId
        ? await updateExpenseAccountBalanceTx(tx, loan.expenseAccountId)
        : null
      return { repayments, newBalance }
    })

    return NextResponse.json({ repayments, newBalance, count: repayments.length }, { status: 201 })
  } catch (error) {
    console.error('POST /api/business-loans/[loanId]/pre-lock-repayments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
