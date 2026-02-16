import { NextRequest, NextResponse } from 'next/server'
import {
  getGlobalPayrollAccount,
  getPayrollAccountBalanceSummary,
  getPayrollAccountStats,
} from '@/lib/payroll-account-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/payroll/account/balance
 * Get payroll account balance with transaction summary
 *
 * Query params:
 * - startDate: Start date for statistics (optional)
 * - endDate: End date for statistics (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add permission check for canViewPayrollAccountBalance

    // Get global payroll account
    const payrollAccount = await getGlobalPayrollAccount()

    if (!payrollAccount) {
      return NextResponse.json(
        { error: 'Payroll account not found' },
        { status: 404 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined

    // Get balance summary
    const balanceSummary = await getPayrollAccountBalanceSummary(payrollAccount.id)

    // Get statistics for the period
    const stats = await getPayrollAccountStats(
      payrollAccount.id,
      startDate,
      endDate
    )

    return NextResponse.json({
      success: true,
      data: {
        accountId: payrollAccount.id,
        accountNumber: payrollAccount.accountNumber,
        currentBalance: Number(payrollAccount.balance),
        calculatedBalance: balanceSummary.calculatedBalance,
        isBalanced: balanceSummary.isBalanced,
        totalDeposits: balanceSummary.totalDeposits,
        totalPayments: balanceSummary.totalPayments,
        depositsCount: balanceSummary.depositsCount,
        paymentsCount: balanceSummary.paymentsCount,
        stats: {
          period: {
            startDate: startDate?.toISOString() || null,
            endDate: endDate?.toISOString() || null,
          },
          depositsThisPeriod: stats.depositsThisPeriod,
          depositsCountThisPeriod: stats.depositsCount,
          paymentsThisPeriod: stats.paymentsThisPeriod,
          paymentsCountThisPeriod: stats.paymentsCount,
          pendingPaymentsCount: stats.pendingPaymentsCount,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching payroll account balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll account balance' },
      { status: 500 }
    )
  }
}
