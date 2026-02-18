import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/restaurant/meal-program/reports
 *
 * Returns three views depending on the `view` query param:
 *   summary     — overall totals, subsidy cost, cash collected, transaction count
 *   salesperson — grouped by soldByEmployee/User
 *   participant — grouped by participant with per-person history
 *
 * Query params:
 *   businessId  required
 *   view        "summary" | "salesperson" | "participant"  (default: summary)
 *   dateFrom?   ISO date string
 *   dateTo?     ISO date string
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    const view = searchParams.get('view') || 'summary'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    const where: any = { businessId }
    if (dateFrom || dateTo) {
      where.transactionDate = {}
      if (dateFrom) where.transactionDate.gte = new Date(dateFrom)
      if (dateTo) where.transactionDate.lte = new Date(dateTo)
    }

    if (view === 'summary') {
      const [transactions, aggResult] = await Promise.all([
        prisma.mealProgramTransactions.findMany({
          where,
          select: {
            subsidyAmount: true,
            cashAmount: true,
            totalAmount: true,
            transactionDate: true,
            subsidizedIsEligibleItem: true,
          },
        }),
        prisma.mealProgramTransactions.aggregate({
          where,
          _count: { id: true },
          _sum: { subsidyAmount: true, cashAmount: true, totalAmount: true },
        }),
      ])

      const totalTransactions = aggResult._count.id
      const totalSubsidy = Number(aggResult._sum.subsidyAmount || 0)
      const totalCash = Number(aggResult._sum.cashAmount || 0)
      const totalRevenue = Number(aggResult._sum.totalAmount || 0)

      // Eligible vs non-eligible item breakdown
      const eligibleCount = transactions.filter((t) => t.subsidizedIsEligibleItem).length
      const upgradeCount = transactions.length - eligibleCount

      // Daily trend (last 30 days or within date range)
      const dailyMap: Record<string, { count: number; subsidy: number; cash: number }> = {}
      for (const t of transactions) {
        const day = t.transactionDate.toISOString().slice(0, 10)
        if (!dailyMap[day]) dailyMap[day] = { count: 0, subsidy: 0, cash: 0 }
        dailyMap[day].count++
        dailyMap[day].subsidy += Number(t.subsidyAmount)
        dailyMap[day].cash += Number(t.cashAmount)
      }

      const dailyTrend = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({ date, ...stats }))

      return NextResponse.json({
        success: true,
        data: {
          totalTransactions,
          totalSubsidy,
          totalCash,
          totalRevenue,
          eligibleItemCount: eligibleCount,
          upgradeCount,
          dailyTrend,
        },
      })
    }

    if (view === 'salesperson') {
      const transactions = await prisma.mealProgramTransactions.findMany({
        where,
        include: {
          soldByEmployee: { select: { id: true, fullName: true } },
          soldByUser: { select: { id: true, name: true, email: true } },
        },
      })

      const salespersonMap: Record<
        string,
        {
          id: string
          name: string
          type: string
          count: number
          totalSubsidy: number
          totalCash: number
          totalRevenue: number
        }
      > = {}

      for (const t of transactions) {
        const key = t.soldByEmployeeId || t.soldByUserId
        const name =
          t.soldByEmployee?.fullName ||
          t.soldByUser?.name ||
          t.soldByUser?.email ||
          'Unknown'
        const type = t.soldByEmployeeId ? 'EMPLOYEE' : 'USER'

        if (!salespersonMap[key]) {
          salespersonMap[key] = { id: key, name, type, count: 0, totalSubsidy: 0, totalCash: 0, totalRevenue: 0 }
        }
        salespersonMap[key].count++
        salespersonMap[key].totalSubsidy += Number(t.subsidyAmount)
        salespersonMap[key].totalCash += Number(t.cashAmount)
        salespersonMap[key].totalRevenue += Number(t.totalAmount)
      }

      return NextResponse.json({
        success: true,
        data: Object.values(salespersonMap).sort((a, b) => b.count - a.count),
      })
    }

    if (view === 'participant') {
      const transactions = await prisma.mealProgramTransactions.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        include: {
          participant: {
            select: {
              id: true,
              participantType: true,
              isActive: true,
              employees: { select: { id: true, fullName: true } },
              persons: { select: { id: true, fullName: true } },
            },
          },
          order: { select: { orderNumber: true } },
          soldByEmployee: { select: { fullName: true } },
          soldByUser: { select: { name: true, email: true } },
        },
      })

      const participantMap: Record<
        string,
        {
          participantId: string
          name: string
          type: string
          isActive: boolean
          count: number
          totalSubsidy: number
          totalCash: number
          lastTransactionDate: string
          transactions: any[]
        }
      > = {}

      for (const t of transactions) {
        const pid = t.participantId
        const name =
          t.participant.employees?.fullName ||
          t.participant.persons?.fullName ||
          `Participant ${pid.slice(-6)}`

        if (!participantMap[pid]) {
          participantMap[pid] = {
            participantId: pid,
            name,
            type: t.participant.participantType,
            isActive: t.participant.isActive,
            count: 0,
            totalSubsidy: 0,
            totalCash: 0,
            lastTransactionDate: t.transactionDate.toISOString(),
            transactions: [],
          }
        }

        participantMap[pid].count++
        participantMap[pid].totalSubsidy += Number(t.subsidyAmount)
        participantMap[pid].totalCash += Number(t.cashAmount)

        if (participantMap[pid].transactions.length < 10) {
          participantMap[pid].transactions.push({
            id: t.id,
            orderNumber: t.order.orderNumber,
            date: t.transactionDate.toISOString(),
            subsidizedItem: t.subsidizedProductName,
            subsidy: Number(t.subsidyAmount),
            cash: Number(t.cashAmount),
            total: Number(t.totalAmount),
            soldBy:
              t.soldByEmployee?.fullName ||
              t.soldByUser?.name ||
              t.soldByUser?.email ||
              'Unknown',
          })
        }
      }

      return NextResponse.json({
        success: true,
        data: Object.values(participantMap).sort((a, b) => b.count - a.count),
      })
    }

    return NextResponse.json(
      { success: false, error: `Unknown view "${view}". Use: summary, salesperson, participant` },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[Meal Program Reports] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch report' },
      { status: 500 }
    )
  }
}
