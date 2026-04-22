import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

function getPeriodKey(date: string, groupBy: 'week' | 'month'): string {
  const d = new Date(date + 'T00:00:00')
  if (groupBy === 'month') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  // ISO week: find Monday of the week
  const day = d.getDay() === 0 ? 7 : d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + 1)
  return monday.toISOString().slice(0, 10)
}

function getPeriodLabel(key: string, groupBy: 'week' | 'month'): string {
  if (groupBy === 'month') {
    const [y, m] = key.split('-')
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
  // Week: "Week of DD Mon YYYY"
  const d = new Date(key + 'T00:00:00')
  const end = new Date(d)
  end.setDate(d.getDate() + 6)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
}

/**
 * GET /api/reports/eod-discrepancy?businessId=&from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|week|month
 * Returns daily (default) or aggregated comparison of manager EOD vs salesperson EOD totals.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const groupBy = (searchParams.get('groupBy') || 'day') as 'day' | 'week' | 'month'

    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const perms = getEffectivePermissions(user, businessId)
    if (user.role !== 'admin' && !perms.canCloseBooks && !perms.canAccessFinancialData) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Default: last 30 days
    const toDate = to ? new Date(to) : new Date()
    toDate.setHours(23, 59, 59, 999)
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    fromDate.setHours(0, 0, 0, 0)

    // Fetch manager EOD saved reports for the date range
    const managerReports = await prisma.savedReports.findMany({
      where: {
        businessId,
        reportType: 'END_OF_DAY',
        reportDate: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        reportDate: true,
        managerName: true,
        cashCounted: true,
        confirmedEcocashAmount: true,
        salespersonCashTotal: true,
        salespersonEcocashTotal: true,
        signedAt: true,
      },
      orderBy: { reportDate: 'desc' },
    })

    // Fetch salesperson EOD aggregates grouped by reportDate
    const spReports = await prisma.salespersonEodReport.groupBy({
      by: ['reportDate'],
      where: {
        businessId,
        reportDate: { gte: fromDate, lte: toDate },
        status: { in: ['SUBMITTED', 'OVERRIDDEN'] },
      },
      _sum: { cashAmount: true, ecocashAmount: true },
      _count: { id: true },
    })

    // Also get pending counts per date
    const spPending = await prisma.salespersonEodReport.groupBy({
      by: ['reportDate'],
      where: {
        businessId,
        reportDate: { gte: fromDate, lte: toDate },
        status: 'PENDING',
      },
      _count: { id: true },
    })

    // Build lookup maps
    const spByDate = new Map(spReports.map(r => [r.reportDate.toISOString().slice(0, 10), r]))
    const pendingByDate = new Map(spPending.map(r => [r.reportDate.toISOString().slice(0, 10), r._count.id]))

    // Merge into daily rows
    const rows = managerReports.map(mr => {
      const dateKey = new Date(mr.reportDate).toISOString().slice(0, 10)
      const sp = spByDate.get(dateKey)

      const managerCash = mr.cashCounted !== null ? Number(mr.cashCounted) : null
      const managerEcocash = mr.confirmedEcocashAmount !== null ? Number(mr.confirmedEcocashAmount) : null
      const spCash = sp ? Number(sp._sum.cashAmount ?? 0) : (mr.salespersonCashTotal !== null ? Number(mr.salespersonCashTotal) : null)
      const spEcocash = sp ? Number(sp._sum.ecocashAmount ?? 0) : (mr.salespersonEcocashTotal !== null ? Number(mr.salespersonEcocashTotal) : null)
      const spCount = sp ? sp._count.id : 0
      const pendingCount = pendingByDate.get(dateKey) ?? 0

      const cashVariance = managerCash !== null && spCash !== null ? managerCash - spCash : null
      const ecocashVariance = managerEcocash !== null && spEcocash !== null ? managerEcocash - spEcocash : null

      return {
        date: dateKey,
        managerName: mr.managerName,
        signedAt: mr.signedAt,
        managerCash,
        managerEcocash,
        spCash,
        spEcocash,
        spSubmittedCount: spCount,
        spPendingCount: pendingCount,
        cashVariance,
        ecocashVariance,
      }
    })

    if (groupBy === 'day') {
      return NextResponse.json({ success: true, data: rows })
    }

    // Aggregate into weekly or monthly buckets
    const buckets = new Map<string, {
      periodKey: string
      periodLabel: string
      daysReported: number
      totalCashVariance: number
      totalEcocashVariance: number
      worstCashVariance: number
      cashDaysNull: number
      ecocashDaysNull: number
    }>()

    for (const row of rows) {
      const key = getPeriodKey(row.date, groupBy)
      if (!buckets.has(key)) {
        buckets.set(key, {
          periodKey: key,
          periodLabel: getPeriodLabel(key, groupBy),
          daysReported: 0,
          totalCashVariance: 0,
          totalEcocashVariance: 0,
          worstCashVariance: 0,
          cashDaysNull: 0,
          ecocashDaysNull: 0,
        })
      }
      const b = buckets.get(key)!
      b.daysReported++
      if (row.cashVariance !== null) {
        b.totalCashVariance += row.cashVariance
        if (Math.abs(row.cashVariance) > Math.abs(b.worstCashVariance)) b.worstCashVariance = row.cashVariance
      } else {
        b.cashDaysNull++
      }
      if (row.ecocashVariance !== null) {
        b.totalEcocashVariance += row.ecocashVariance
      } else {
        b.ecocashDaysNull++
      }
    }

    const summary = Array.from(buckets.values())
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey))
      .map(b => ({
        periodKey: b.periodKey,
        periodLabel: b.periodLabel,
        daysReported: b.daysReported,
        totalCashVariance: b.cashDaysNull === b.daysReported ? null : b.totalCashVariance,
        totalEcocashVariance: b.ecocashDaysNull === b.daysReported ? null : b.totalEcocashVariance,
        worstCashVariance: b.cashDaysNull === b.daysReported ? null : b.worstCashVariance,
      }))

    return NextResponse.json({ success: true, data: summary })
  } catch (error: any) {
    console.error('[reports/eod-discrepancy GET]', error)
    return NextResponse.json({ error: 'Failed to fetch discrepancy report' }, { status: 500 })
  }
}
