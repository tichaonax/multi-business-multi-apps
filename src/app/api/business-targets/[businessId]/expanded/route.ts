import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { calculateDailyTargetsForMonth } from '@/lib/business-targets/calculate-daily-target'
import { calculateMinimumTarget } from '@/lib/business-targets/calculate-minimum-target'
import { calculateLineContributions } from '@/lib/business-targets/calculate-line-contributions'
import { calculateSalesPeriodComparison } from '@/lib/sales-performance/calculate-sales-period-comparison'
import { statusForRatio } from '@/lib/business-targets/target-status'
import { getDayBoundaryInTimezone, getServerDefaultTimezone } from '@/lib/timezone-utils'

const CHART_DAYS = 14

const ORDERS_WHERE = (businessId: string) => ({
  businessId,
  status: 'COMPLETED' as const,
  paymentMethod: { not: 'EXPENSE_ACCOUNT' as any },
})

async function actualBetween(businessId: string, start: Date, end: Date): Promise<number> {
  const agg = await prisma.businessOrders.aggregate({
    where: { ...ORDERS_WHERE(businessId), createdAt: { gte: start, lt: end } },
    _sum: { totalAmount: true },
  })
  return Number(agg._sum.totalAmount || 0)
}

function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null
  return ((curr - prev) / prev) * 100
}

function progress(target: number, actual: number) {
  return {
    target,
    actual,
    remaining: Math.max(0, target - actual),
    percentAchieved: target > 0 ? Math.round((actual / target) * 100) : 0,
  }
}

/**
 * GET /api/business-targets/[businessId]/expanded
 *
 * MBM-288 §5.2 — the expanded view opened by tapping the POS widget: daily/
 * weekly/monthly progress, comparisons to the equivalent-length prior period,
 * and a 14-day achievement chart. Operational tier
 * (`canViewBusinessTargetProgress`) gets the numbers; admin tier
 * (`canManageBusinessTargets`) additionally gets the commitment breakdown,
 * the most recent calculation's assumptions, and the buffer config — same
 * permission-tiered response-shape pattern as the main config route.
 *
 * Day/week/month boundaries for TARGETS follow the same server-local,
 * UTC-date-string convention `calculateTodayTarget` already established in
 * Phase 4 (not client-timezone-aware) — kept consistent rather than mixing
 * in a different convention here. Boundaries for ACTUAL sales use the
 * client-supplied timezone (matching `/today`). Week-over-week and
 * month-over-month comparisons use a fixed 7-day-back / same-day-of-month
 * shift rather than full calendar-aware re-alignment — a deliberate v1
 * simplification, same spirit as the achievement-factor being fixed at 1.0
 * in the recommendation formula.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const admin = isSystemAdmin(user)
    const canManage = admin || hasPermission(user, 'canManageBusinessTargets', businessId)
    const canView = canManage || hasPermission(user, 'canViewBusinessTargetProgress', businessId)
    if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const config = await prisma.businessTargetConfig.findUnique({ where: { businessId } })
    if (!config || !config.isEnabled || !config.approvedMonthlyTarget) {
      return NextResponse.json({ success: true, data: { isEnabled: false } })
    }
    const approvedMonthlyTarget = Number(config.approvedMonthlyTarget)

    const { searchParams } = new URL(request.url)
    const timezone = searchParams.get('timezone') || getServerDefaultTimezone()

    // --- Target-side: server-local calendar day, same convention as calculateTodayTarget (Phase 4) ---
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const todayDateStr = now.toISOString().slice(0, 10)
    const [ty, tm, td] = todayDateStr.split('-').map(Number)
    const todayUTC = new Date(Date.UTC(ty, tm - 1, td))
    const dow = todayUTC.getUTCDay()
    const daysSinceMonday = dow === 0 ? 6 : dow - 1

    const { targets: monthTargets } = await calculateDailyTargetsForMonth({ businessId, year, month, approvedMonthlyTarget })
    const dailyTarget = monthTargets.get(todayDateStr) ?? 0
    let weeklyTarget = 0
    for (let i = -daysSinceMonday; i <= 0; i++) {
      const d = new Date(Date.UTC(ty, tm - 1, td + i))
      weeklyTarget += monthTargets.get(d.toISOString().slice(0, 10)) ?? 0
    }

    // --- Actual-side: client timezone, so "today"/"this week"/"this month" match what the operator sees on the clock ---
    const { start: todayStart, end: todayEnd } = getDayBoundaryInTimezone(timezone, now)
    const weekStart = new Date(todayStart.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000)
    const monthStartRef = new Date(Date.UTC(ty, tm - 1, 1, 12))
    const { start: monthStart } = getDayBoundaryInTimezone(timezone, monthStartRef)

    const [dailyActual, weeklyActual, monthlyActual, comparison] = await Promise.all([
      actualBetween(businessId, todayStart, todayEnd),
      actualBetween(businessId, weekStart, now),
      actualBetween(businessId, monthStart, now),
      calculateSalesPeriodComparison({ businessIds: [businessId], timezone }),
    ])

    // Week-over-week / month-over-month: fixed-shift "to date" comparisons (documented simplification above).
    const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastWeekPartialEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastMonthStartRef = new Date(Date.UTC(ty, tm - 2, 1, 12))
    const { start: lastMonthStart } = getDayBoundaryInTimezone(timezone, lastMonthStartRef)
    const lastMonthPartialEndRef = new Date(Date.UTC(ty, tm - 2, td, 12))
    const { start: lastMonthPartialEnd } = getDayBoundaryInTimezone(timezone, lastMonthPartialEndRef)

    const [lastWeekActual, lastMonthActual] = await Promise.all([
      actualBetween(businessId, lastWeekStart, lastWeekPartialEnd),
      actualBetween(businessId, lastMonthStart, lastMonthPartialEnd),
    ])

    const todayVsYesterday = comparison[0]
      ? { actual: comparison[0].today.totalAmount, previousActual: comparison[0].yesterday.totalAmount, deltaPct: comparison[0].todaySalesDeltaPct }
      : { actual: dailyActual, previousActual: 0, deltaPct: null }

    const fractionOfDayElapsed = Math.min(1, Math.max(0, (now.getTime() - todayStart.getTime()) / (todayEnd.getTime() - todayStart.getTime())))
    const expectedByNow = dailyTarget * fractionOfDayElapsed
    const dailyRatio = expectedByNow > 0.01 ? dailyActual / expectedByNow : dailyTarget > 0 ? dailyActual / dailyTarget : 1

    // --- 14-day achievement chart (target may span into the previous month) ---
    const chartDates: string[] = []
    for (let i = CHART_DAYS - 1; i >= 0; i--) {
      chartDates.push(new Date(Date.UTC(ty, tm - 1, td - i)).toISOString().slice(0, 10))
    }
    const needsPrevMonth = chartDates.some((d) => !d.startsWith(`${year}-${String(month).padStart(2, '0')}`))
    const prevMonthDate = new Date(Date.UTC(year, month - 2, 1))
    const prevMonthTargets = needsPrevMonth
      ? (await calculateDailyTargetsForMonth({ businessId, year: prevMonthDate.getUTCFullYear(), month: prevMonthDate.getUTCMonth() + 1, approvedMonthlyTarget })).targets
      : null

    const chart = await Promise.all(
      chartDates.map(async (dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number)
        const refInstant = new Date(Date.UTC(y, m - 1, d, 12))
        const { start, end } = getDayBoundaryInTimezone(timezone, refInstant)
        const actual = await actualBetween(businessId, start, end)
        const target = monthTargets.get(dateStr) ?? prevMonthTargets?.get(dateStr) ?? 0
        return { date: dateStr, target, actual }
      })
    )

    const base = {
      isEnabled: true,
      daily: { ...progress(dailyTarget, dailyActual), status: statusForRatio(dailyRatio) },
      weekly: progress(weeklyTarget, weeklyActual),
      monthly: progress(approvedMonthlyTarget, monthlyActual),
      comparisons: {
        todayVsYesterday,
        weekVsLastWeek: { actual: weeklyActual, previousActual: lastWeekActual, deltaPct: pctChange(weeklyActual, lastWeekActual) },
        monthVsLastMonth: { actual: monthlyActual, previousActual: lastMonthActual, deltaPct: pctChange(monthlyActual, lastMonthActual) },
      },
      chart,
    }

    if (!canManage) {
      return NextResponse.json({ success: true, data: base })
    }

    const [commitments, breakdown, lastRecalculation] = await Promise.all([
      prisma.businessTargetCommitment.findMany({ where: { businessId, isActive: true }, orderBy: { createdAt: 'asc' } }),
      calculateMinimumTarget({ businessId }),
      prisma.businessTargetOverrideHistory.findFirst({ where: { businessId, changeType: 'RECALCULATION' }, orderBy: { changedAt: 'desc' } }),
    ])
    const contributions = await calculateLineContributions(businessId, breakdown)

    return NextResponse.json({
      success: true,
      data: {
        ...base,
        bufferType: config.bufferType,
        bufferValue: Number(config.bufferValue),
        commitments: commitments.map((c) => ({ ...c, monthlyAmount: Number(c.monthlyAmount) })),
        breakdown,
        contributions,
        assumptions: lastRecalculation?.breakdownSnapshot ?? null,
      },
    })
  } catch (error) {
    console.error('Error fetching expanded business target view:', error)
    return NextResponse.json({ error: 'Failed to fetch expanded target view' }, { status: 500 })
  }
}
