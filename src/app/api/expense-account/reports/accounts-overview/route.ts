import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/reports/accounts-overview
 * System-wide summary per account with deposit/payment totals for a date range
 *
 * Query params:
 * - startDate: Filter from this date (optional)
 * - endDate: Filter up to this date (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canViewExpenseReports) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)
    const hasDateFilter = Object.keys(dateFilter).length > 0

    const accounts = await prisma.expenseAccounts.findMany({
      where: { isActive: true },
      select: {
        id: true,
        accountNumber: true,
        accountName: true,
        accountType: true,
        balance: true,
        deposits: {
          where: hasDateFilter ? { depositDate: dateFilter } : undefined,
          select: { amount: true },
        },
        payments: {
          where: {
            status: 'SUBMITTED',
            ...(hasDateFilter ? { paymentDate: dateFilter } : {}),
          },
          select: { amount: true },
        },
      },
      orderBy: { accountName: 'asc' },
    })

    let systemTotalBalance = 0
    let systemTotalDeposits = 0
    let systemTotalPayments = 0

    const result = accounts.map((account) => {
      const totalDeposits = account.deposits.reduce((sum, d) => sum + Number(d.amount), 0)
      const totalPayments = account.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const netChange = totalDeposits - totalPayments
      const balance = Number(account.balance)

      systemTotalBalance += balance
      systemTotalDeposits += totalDeposits
      systemTotalPayments += totalPayments

      return {
        id: account.id,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountType: account.accountType,
        balance,
        totalDeposits,
        totalPayments,
        netChange,
        depositCount: account.deposits.length,
        paymentCount: account.payments.length,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        accounts: result,
        systemTotals: {
          totalBalance: systemTotalBalance,
          totalDeposits: systemTotalDeposits,
          totalPayments: systemTotalPayments,
          netChange: systemTotalDeposits - systemTotalPayments,
          accountCount: result.length,
        },
      },
    })
  } catch (error) {
    console.error('Error generating accounts overview report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
