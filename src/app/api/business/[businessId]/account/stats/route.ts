import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/business/[businessId]/account/stats
 * Returns daily aggregated credits vs debits for chart rendering.
 *
 * Query params:
 *   period - "7d" | "30d" | "90d" | "1y" (default "30d")
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: { userId: user.id, businessId, isActive: true },
      }) as any
      if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      const perms = getEffectivePermissions(user, businessId)
      if (!perms.canAccessFinancialData) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') ?? '30d'

    const now = new Date()
    const startDate = new Date()
    if (period === '7d') startDate.setDate(now.getDate() - 7)
    else if (period === '90d') startDate.setDate(now.getDate() - 90)
    else if (period === '1y') startDate.setFullYear(now.getFullYear() - 1)
    else startDate.setDate(now.getDate() - 30) // 30d default

    const CREDIT_TYPES = ['deposit', 'transfer', 'loan_received', 'CREDIT']
    const DEBIT_TYPES = ['withdrawal', 'loan_disbursement', 'loan_payment', 'DEBIT']

    const transactions = await (prisma.businessTransactions as any).findMany({
      where: {
        businessId,
        createdAt: { gte: startDate },
      },
      select: {
        amount: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group by day
    const dayMap = new Map<string, { date: string; credits: number; debits: number }>()

    for (const tx of transactions) {
      const dateKey = new Date(tx.createdAt).toISOString().slice(0, 10)
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, { date: dateKey, credits: 0, debits: 0 })
      }
      const entry = dayMap.get(dateKey)!
      const amount = Number(tx.amount)
      if (CREDIT_TYPES.includes(tx.type)) entry.credits += amount
      // DEBIT-type amounts are stored negative; take absolute value for the chart
      else if (DEBIT_TYPES.includes(tx.type)) entry.debits += Math.abs(amount)
    }

    // Fill in missing days with 0 values so chart is continuous
    const chartData: { date: string; credits: number; debits: number }[] = []
    const cursor = new Date(startDate)
    cursor.setHours(0, 0, 0, 0)
    const endDay = new Date(now)
    endDay.setHours(0, 0, 0, 0)

    while (cursor <= endDay) {
      const key = cursor.toISOString().slice(0, 10)
      chartData.push(dayMap.get(key) ?? { date: key, credits: 0, debits: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    // Summary totals for the period
    const periodCredits = chartData.reduce((s, d) => s + d.credits, 0)
    const periodDebits = chartData.reduce((s, d) => s + d.debits, 0)

    return NextResponse.json({
      success: true,
      data: {
        period,
        chartData,
        summary: {
          totalCredits: periodCredits,
          totalDebits: periodDebits,
          net: periodCredits - periodDebits,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching business account stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
