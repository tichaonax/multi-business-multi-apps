import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * Resolve whether the current user can access this loan and in what capacity.
 * Returns the loan + role, or null if access is denied.
 */
async function resolveLoanAccess(
  userId: string,
  isAdmin: boolean,
  loanId: string
): Promise<{
  loan: Awaited<ReturnType<typeof getLoanFull>>
  role: 'admin' | 'manager' | 'lender'
} | null> {
  const loan = await getLoanFull(loanId)
  if (!loan) return null

  if (isAdmin) return { loan, role: 'admin' }
  if (loan.managedByUserId === userId) return { loan, role: 'manager' }
  if (loan.lenderUserId === userId) return { loan, role: 'lender' }
  return null
}

async function getLoanFull(loanId: string) {
  return prisma.businessLoan.findUnique({
    where: { id: loanId },
    include: {
      managedBy: { select: { id: true, name: true, email: true } },
      lenderUser: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
      locker: { select: { id: true, name: true } },
      lockRequester: { select: { id: true, name: true } },
      expenseAccount: {
        select: {
          id: true,
          accountNumber: true,
          accountName: true,
          balance: true,
          isLoanAccount: true,
        },
      },
      expenseEntries: {
        orderBy: { expenseDate: 'asc' },
        include: { creator: { select: { id: true, name: true } } },
      },
      preLockRepayments: {
        orderBy: { repaymentDate: 'asc' },
        include: { creator: { select: { id: true, name: true } } },
      },
      withdrawalRequests: {
        orderBy: { createdAt: 'desc' },
        include: {
          approver: { select: { id: true, name: true } },
          payer: { select: { id: true, name: true } },
        },
      },
    },
  })
}

function computeLoanSummary(loan: NonNullable<Awaited<ReturnType<typeof getLoanFull>>>) {
  const totalExpenses = loan.expenseEntries.reduce((s, e) => s + Number(e.amount), 0)
  const totalPreLockRepayments = loan.preLockRepayments.reduce((s, r) => s + Number(r.amount), 0)
  const currentBalance = Number(loan.expenseAccount?.balance ?? 0)
  const lockedBalance = loan.lockedBalance !== null ? Number(loan.lockedBalance) : null

  const totalDepositedSinceLock =
    lockedBalance !== null ? Math.max(0, Math.abs(lockedBalance) - Math.abs(currentBalance)) : 0

  const availableToWithdraw =
    lockedBalance !== null ? Math.max(0, Math.abs(lockedBalance) - Math.abs(currentBalance)) : 0

  return {
    totalExpenses,
    totalPreLockRepayments,
    currentBalance,
    lockedBalance,
    totalDepositedSinceLock,
    availableToWithdraw,
  }
}

/**
 * GET /api/business-loans/[loanId]
 * Full loan detail. Access: admin (full), assigned user (full), lender (read-only subset).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = getEffectivePermissions(user)
    const { loanId } = await params

    const access = await resolveLoanAccess(
      user.id,
      user.role === 'admin' || permissions.canManageBusinessLoans,
      loanId
    )

    if (!access) {
      return NextResponse.json({ error: 'Loan not found or access denied' }, { status: 404 })
    }

    const { loan, role } = access
    const summary = computeLoanSummary(loan)

    // Lenders see a restricted view — no internal expense details
    if (role === 'lender') {
      return NextResponse.json({
        loan: {
          id: loan.id,
          loanNumber: loan.loanNumber,
          description: loan.description,
          lenderName: loan.lenderName,
          status: loan.status,
          lockedAt: loan.lockedAt,
          settledAt: loan.settledAt,
          notes: loan.notes,
          expenseAccount: loan.expenseAccount
            ? { id: loan.expenseAccount.id, balance: loan.expenseAccount.balance }
            : null,
        },
        summary: {
          currentBalance: summary.currentBalance,
          lockedBalance: summary.lockedBalance,
          totalDepositedSinceLock: summary.totalDepositedSinceLock,
          availableToWithdraw: summary.availableToWithdraw,
        },
        withdrawalRequests: loan.withdrawalRequests,
        role,
      })
    }

    return NextResponse.json({ loan, summary, role })
  } catch (error) {
    console.error('GET /api/business-loans/[loanId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/business-loans/[loanId]
 * Update description/notes. Admin only.
 */
export async function PUT(
  request: NextRequest,
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
    const body = await request.json()
    const { description, notes } = body

    const loan = await prisma.businessLoan.findUnique({ where: { id: loanId }, select: { id: true } })
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    const updated = await prisma.businessLoan.update({
      where: { id: loanId },
      data: {
        ...(description !== undefined && { description }),
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json({ loan: updated })
  } catch (error) {
    console.error('PUT /api/business-loans/[loanId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
