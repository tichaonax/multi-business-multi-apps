import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getExpenseAccountBalanceSummary } from '@/lib/expense-account-utils'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { getUserGrantLevel } from '@/lib/expense-account-access'

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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount) {
      return NextResponse.json(
        { error: 'You do not have permission to access expense accounts' },
        { status: 403 }
      )
    }

    const { accountId } = await params

    // Block users with canViewBalance = false (UserAccess) or PERSONAL grant from seeing the balance
    const [accessRecord, grantLevel] = await Promise.all([
      prisma.expenseAccountUserAccess.findUnique({
        where: { accountId_userId: { accountId, userId: user.id } },
        select: { canViewBalance: true, isActive: true },
      }),
      getUserGrantLevel(user.id, accountId),
    ])
    if ((accessRecord?.isActive && !accessRecord.canViewBalance) || grantLevel === 'PERSONAL') {
      return NextResponse.json(
        { error: 'You do not have permission to view the balance of this account' },
        { status: 403 }
      )
    }

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
