import { prisma } from '@/lib/prisma'
import { getDayBoundaryInTimezone, getServerDefaultTimezone } from '@/lib/timezone-utils'

/**
 * Server-side, shared today/yesterday/day-before-yesterday sales comparison —
 * pulled out of the Dashboard page's own client-side computation so any
 * caller (the Dashboard, and later the business-target feature's "expected
 * vs actual" progress math) can share one correct implementation instead of
 * each re-deriving it.
 *
 * Previously: the Dashboard fired 3 raw HTTP requests to
 * /api/universal/orders PER business (one per day, each returning a whole
 * paginated order page just to read `meta.summary` off it), then computed
 * percentage deltas in the browser using naive local-time date strings. For
 * N businesses that's 3N full round-trips and no timezone awareness at all.
 * This does the same math in one call, server-side, using the shared
 * timezone-boundary helpers (src/lib/timezone-utils.ts) that the daily-sales
 * routes already use — so a business day means the same thing everywhere in
 * this app, not something computed slightly differently in each place that
 * needs it.
 *
 * Deliberately matches /api/universal/orders' own summary filter exactly
 * (status COMPLETED, excluding EXPENSE_ACCOUNT meal-program-subsidy orders)
 * and buckets by `createdAt` — same field the Dashboard's current numbers
 * are already implicitly based on via that route. Note for anyone revisiting
 * this: `BusinessOrders.transactionDate` exists specifically to bucket
 * backdated manual entries onto the day they actually happened rather than
 * the day they were entered, and isn't used here — switching to it would
 * change historical comparison figures, which is out of scope for this
 * refactor (a behavior-preserving extraction), not something to change as a
 * side effect.
 */

export interface PeriodSalesSummary {
  totalOrders: number
  totalAmount: number
  totalItemsSold: number
}

export interface BusinessSalesComparison {
  businessId: string
  today: PeriodSalesSummary
  yesterday: PeriodSalesSummary
  dayBeforeYesterday: PeriodSalesSummary
  /** Orders still PENDING as of today — only meaningful for "today", not the two prior days. */
  todayPendingOrders: number
  todayPendingRevenue: number
  /** today's sales vs yesterday's, as a %; null when yesterday was $0 (nothing to compare against) */
  todaySalesDeltaPct: number | null
  /** yesterday's sales vs the day before, as a % */
  yesterdaySalesDeltaPct: number | null
  todayItemsDeltaPct: number | null
  yesterdayItemsDeltaPct: number | null
}

function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null
  return ((curr - prev) / prev) * 100
}

const EMPTY_SUMMARY: PeriodSalesSummary = { totalOrders: 0, totalAmount: 0, totalItemsSold: 0 }

async function summarizeWindow(
  businessIds: string[],
  start: Date,
  end: Date
): Promise<Map<string, PeriodSalesSummary>> {
  const ordersWhere = {
    businessId: { in: businessIds },
    status: 'COMPLETED' as const,
    paymentMethod: { not: 'EXPENSE_ACCOUNT' as any },
    createdAt: { gte: start, lt: end },
  }

  const [grouped, itemSums] = await Promise.all([
    prisma.businessOrders.groupBy({
      by: ['businessId'],
      where: ordersWhere,
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    // businessOrderItems has no businessId column of its own, so it can't be
    // grouped by business directly — one relation-filtered aggregate per
    // business, matching the same relation-filter pattern
    // /api/universal/orders already uses for a single business's summary.
    Promise.all(
      businessIds.map(async (businessId) => {
        const agg = await prisma.businessOrderItems.aggregate({
          where: { business_orders: { ...ordersWhere, businessId } } as any,
          _sum: { quantity: true },
        })
        return { businessId, totalItemsSold: Number(agg._sum.quantity || 0) }
      })
    ),
  ])

  const result = new Map<string, PeriodSalesSummary>()
  for (const businessId of businessIds) result.set(businessId, { ...EMPTY_SUMMARY })
  for (const row of grouped) {
    const existing = result.get(row.businessId) ?? { ...EMPTY_SUMMARY }
    existing.totalOrders = row._count._all
    existing.totalAmount = Number(row._sum.totalAmount || 0)
    result.set(row.businessId, existing)
  }
  for (const { businessId, totalItemsSold } of itemSums) {
    const existing = result.get(businessId) ?? { ...EMPTY_SUMMARY }
    existing.totalItemsSold = totalItemsSold
    result.set(businessId, existing)
  }
  return result
}

export async function calculateSalesPeriodComparison(params: {
  businessIds: string[]
  /** IANA timezone, e.g. "Africa/Harare". Defaults to the server's own OS timezone when omitted, matching daily-sales's existing fallback. */
  timezone?: string
}): Promise<BusinessSalesComparison[]> {
  const { businessIds } = params
  if (businessIds.length === 0) return []

  const timezone = params.timezone || getServerDefaultTimezone()
  const now = new Date()
  const yesterdayRef = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const dayBeforeRef = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

  const todayBoundary = getDayBoundaryInTimezone(timezone, now)
  const yesterdayBoundary = getDayBoundaryInTimezone(timezone, yesterdayRef)
  const dayBeforeBoundary = getDayBoundaryInTimezone(timezone, dayBeforeRef)

  const [todayMap, yesterdayMap, dayBeforeMap, pendingRows] = await Promise.all([
    summarizeWindow(businessIds, todayBoundary.start, todayBoundary.end),
    summarizeWindow(businessIds, yesterdayBoundary.start, yesterdayBoundary.end),
    summarizeWindow(businessIds, dayBeforeBoundary.start, dayBeforeBoundary.end),
    prisma.businessOrders.groupBy({
      by: ['businessId'],
      where: { businessId: { in: businessIds }, status: 'PENDING', createdAt: { gte: todayBoundary.start, lt: todayBoundary.end } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
  ])
  const pendingMap = new Map(pendingRows.map((r) => [r.businessId, { count: r._count._all, amount: Number(r._sum.totalAmount || 0) }]))

  return businessIds.map((businessId) => {
    const today = todayMap.get(businessId) ?? { ...EMPTY_SUMMARY }
    const yesterday = yesterdayMap.get(businessId) ?? { ...EMPTY_SUMMARY }
    const dayBeforeYesterday = dayBeforeMap.get(businessId) ?? { ...EMPTY_SUMMARY }
    const pending = pendingMap.get(businessId)
    return {
      businessId,
      today,
      yesterday,
      dayBeforeYesterday,
      todayPendingOrders: pending?.count ?? 0,
      todayPendingRevenue: pending?.amount ?? 0,
      todaySalesDeltaPct: pctChange(today.totalAmount, yesterday.totalAmount),
      yesterdaySalesDeltaPct: pctChange(yesterday.totalAmount, dayBeforeYesterday.totalAmount),
      todayItemsDeltaPct: pctChange(today.totalItemsSold, yesterday.totalItemsSold),
      yesterdayItemsDeltaPct: pctChange(yesterday.totalItemsSold, dayBeforeYesterday.totalItemsSold),
    }
  })
}
