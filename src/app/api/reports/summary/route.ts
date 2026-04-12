import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate + 'T23:59:59') : new Date()

    // Revenue from completed sales — fall back to createdAt when transactionDate is null
    const revenueRows = await prisma.$queryRaw<{ day: Date; revenue: number }[]>`
      SELECT
        date_trunc('day', COALESCE("transactionDate", "createdAt"))::date AS day,
        SUM("totalAmount")::float AS revenue
      FROM business_orders
      WHERE status = 'COMPLETED'
        AND "orderType" = 'SALE'
        AND COALESCE("transactionDate", "createdAt") BETWEEN ${start} AND ${end}
      GROUP BY day
      ORDER BY day
    `

    const totalRevenue = revenueRows.reduce((s, r) => s + (r.revenue ?? 0), 0)

    // Expenses from expense account payments
    const expenseRows = await prisma.$queryRaw<{ category: string | null; total: number }[]>`
      SELECT
        ec.name AS category,
        SUM(eap.amount)::float AS total
      FROM expense_account_payments eap
      LEFT JOIN expense_categories ec ON ec.id = eap."categoryId"
      WHERE eap.status IN ('SUBMITTED', 'APPROVED', 'PAID')
        AND eap."paymentDate" BETWEEN ${start} AND ${end}
      GROUP BY ec.name
      ORDER BY total DESC
      LIMIT 8
    `

    const totalExpenses = expenseRows.reduce((s, r) => s + (r.total ?? 0), 0)

    const expensesByCategory = expenseRows.map(r => ({
      category: r.category ?? 'Uncategorised',
      amount: Math.round(r.total * 100) / 100,
    }))

    const revenueTrend = revenueRows.map(r => ({
      date: r.day instanceof Date ? r.day.toISOString().split('T')[0] : String(r.day),
      revenue: Math.round((r.revenue ?? 0) * 100) / 100,
    }))

    return NextResponse.json({
      success: true,
      dateRange: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
      revenueTrend,
      expensesByCategory,
    })
  } catch (error) {
    console.error('Reports summary error:', error)
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
