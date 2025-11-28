import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getExpenseAccountBalanceSummary } from '@/lib/expense-account-utils'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/[accountId]/balance
 * Return balance summary (totalDeposits, totalPayments, currentBalance, depositCount, paymentCount, pendingPayments)
 * Optionally triggers balance recalculation if needed
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.canAccessExpenseAccount) {
      return NextResponse.json(
        { error: 'You do not have permission to access expense accounts' },
        { status: 403 }
      )
    }

    const { accountId } = await params

    // Check if account exists
    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
      select: { id: true, accountNumber: true, accountName: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Expense account not found' },
        { status: 404 }
      )
    }

    // Get balance summary
    const summary = await getExpenseAccountBalanceSummary(accountId)

    return NextResponse.json({
      success: true,
      data: {
        accountId: summary.accountId,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        balance: summary.balance,
        calculatedBalance: summary.calculatedBalance,
        totalDeposits: summary.totalDeposits,
        totalPayments: summary.totalPayments,
        depositCount: summary.depositsCount,
        paymentCount: summary.paymentCount,
        pendingPayments: summary.pendingPayments,
        isBalanced: summary.isBalanced,
      },
    })
  } catch (error) {
    console.error('Error fetching expense account balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expense account balance' },
      { status: 500 }
    )
  }
}
