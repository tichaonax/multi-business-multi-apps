import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/reports/trends
 * Monthly income vs expenses trends across all (or one) expense account
 *
 * Query params:
 * - year: number (default: current year)
 * - accountId: string (optional — filter to single account)
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
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const accountId = searchParams.get('accountId')

    const startOfYear = new Date(`${year}-01-01`)
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`)

    const depositWhere: any = { depositDate: { gte: startOfYear, lte: endOfYear } }
    const paymentWhere: any = { status: 'SUBMITTED', paymentDate: { gte: startOfYear, lte: endOfYear } }

    if (accountId) {
      depositWhere.expenseAccountId = accountId
      paymentWhere.expenseAccountId = accountId
    }

    const [deposits, payments] = await Promise.all([
      prisma.expenseAccountDeposits.findMany({
        where: depositWhere,
        select: { depositDate: true, amount: true },
      }),
      prisma.expenseAccountPayments.findMany({
        where: paymentWhere,
        select: { paymentDate: true, amount: true },
      }),
    ])

    // Build monthly map for all 12 months
    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyMap = new Map<string, { month: string; label: string; totalDeposits: number; totalPayments: number; netChange: number }>()

    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${String(m).padStart(2, '0')}`
      monthlyMap.set(key, {
        month: key,
        label: `${MONTH_LABELS[m - 1]} ${year}`,
        totalDeposits: 0,
        totalPayments: 0,
        netChange: 0,
      })
    }

    deposits.forEach((d) => {
      const date = new Date(d.depositDate)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const entry = monthlyMap.get(key)
      if (entry) entry.totalDeposits += Number(d.amount)
    })

    payments.forEach((p) => {
      const date = new Date(p.paymentDate)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const entry = monthlyMap.get(key)
      if (entry) entry.totalPayments += Number(p.amount)
    })

    const monthly = Array.from(monthlyMap.values()).map((m) => ({
      ...m,
      netChange: m.totalDeposits - m.totalPayments,
    }))

    const yearlyTotalDeposits = monthly.reduce((s, m) => s + m.totalDeposits, 0)
    const yearlyTotalPayments = monthly.reduce((s, m) => s + m.totalPayments, 0)
    const bestMonth = [...monthly].sort((a, b) => b.totalDeposits - a.totalDeposits)[0]
    const worstMonth = [...monthly].sort((a, b) => b.totalPayments - a.totalPayments)[0]

    return NextResponse.json({
      success: true,
      data: {
        monthly,
        yearlyTotals: {
          totalDeposits: yearlyTotalDeposits,
          totalPayments: yearlyTotalPayments,
          netChange: yearlyTotalDeposits - yearlyTotalPayments,
          bestMonth: bestMonth?.totalDeposits > 0 ? bestMonth.label : null,
          worstMonth: worstMonth?.totalPayments > 0 ? worstMonth.label : null,
        },
      },
    })
  } catch (error) {
    console.error('Error generating trends report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
