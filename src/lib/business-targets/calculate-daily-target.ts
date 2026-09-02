import { prisma } from '@/lib/prisma'
import { countTradingDaysInMonth } from './calculate-minimum-target'

/**
 * MBM-288 §3.3 — weekday-weighted daily allocation of the approved monthly
 * target, with manual day-adjustment reconciliation (§3.3's CLOSED/BOOST/
 * REDUCTION/CUSTOM redistribution rules). See the plan doc for the full
 * derivation — this always reconciles exactly: sum(dailyTarget for every
 * day in the month) === approvedMonthlyTarget, to the cent.
 */

const WEEKDAY_HISTORY_DAYS = 90
const DAY_FIELDS = ['tradesSunday', 'tradesMonday', 'tradesTuesday', 'tradesWednesday', 'tradesThursday', 'tradesFriday', 'tradesSaturday'] as const // index = Date#getDay()

export interface DailyTargetsForMonth {
  /** dateStr (YYYY-MM-DD) -> target amount for that day */
  targets: Map<string, number>
  approvedMonthlyTarget: number
  tradingDaysInMonth: number
}

async function getWeekdaySalesWeights(businessId: string): Promise<number[] | null> {
  const since = new Date(Date.now() - WEEKDAY_HISTORY_DAYS * 24 * 60 * 60 * 1000)
  const orders = await prisma.businessOrders.findMany({
    where: { businessId, status: 'COMPLETED', paymentMethod: { not: 'EXPENSE_ACCOUNT' as any }, createdAt: { gte: since } },
    select: { createdAt: true, totalAmount: true },
  })
  if (orders.length === 0) return null

  const sumByWeekday = new Array(7).fill(0)
  const countByWeekday = new Array(7).fill(0)
  for (const o of orders) {
    const day = o.createdAt.getDay()
    sumByWeekday[day] += Number(o.totalAmount)
    countByWeekday[day] += 1
  }
  // Average per occurrence of that weekday in the window, not raw sum — a
  // weekday that happened to occur one extra time in the 90-day window
  // shouldn't get an inflated weight just from that.
  const avgByWeekday = sumByWeekday.map((sum, i) => (countByWeekday[i] > 0 ? sum / countByWeekday[i] : 0))
  const overallAvg = avgByWeekday.reduce((a, b) => a + b, 0) / 7
  if (overallAvg <= 0) return null

  return avgByWeekday.map((avg) => (avg > 0 ? avg / overallAvg : 1))
}

export async function calculateDailyTargetsForMonth(params: {
  businessId: string
  year: number
  month: number // 1-12
  approvedMonthlyTarget: number
}): Promise<DailyTargetsForMonth> {
  const { businessId, year, month, approvedMonthlyTarget } = params

  const [schedule, adjustments, weekdayWeights] = await Promise.all([
    prisma.businessTradingSchedule.findUnique({ where: { businessId } }),
    prisma.businessTargetDayAdjustment.findMany({
      where: { businessId, date: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) } },
    }),
    getWeekdaySalesWeights(businessId),
  ])

  const daysInMonth = new Date(year, month, 0).getDate()
  const adjustmentByDate = new Map(adjustments.map((a) => [a.date.toISOString().slice(0, 10), a]))

  // Step 1: which days trade, and their raw (pre-adjustment) weight.
  const tradingDays: { dateStr: string; weekday: number }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month - 1, d))
    const dateStr = date.toISOString().slice(0, 10)
    const weekday = date.getUTCDay()
    const adjustment = adjustmentByDate.get(dateStr)
    if (adjustment?.adjustmentType === 'CLOSED') continue
    const tradesThisWeekday = !schedule || (schedule as any)[DAY_FIELDS[weekday]]
    if (!tradesThisWeekday) continue
    tradingDays.push({ dateStr, weekday })
  }

  const weights = weekdayWeights ?? new Array(7).fill(1) // even split when insufficient history
  const totalWeight = tradingDays.reduce((sum, d) => sum + weights[d.weekday], 0)

  const targets = new Map<string, number>()
  if (totalWeight > 0) {
    for (const { dateStr, weekday } of tradingDays) {
      targets.set(dateStr, approvedMonthlyTarget * (weights[weekday] / totalWeight))
    }
  }

  // Step 2: apply BOOST/REDUCTION/CUSTOM overrides, redistributing the delta
  // across the remaining un-adjusted trading days so the month still
  // reconciles exactly.
  const nonClosedAdjustments = adjustments.filter((a) => a.adjustmentType !== 'CLOSED' && targets.has(a.date.toISOString().slice(0, 10)))
  let totalDelta = 0
  for (const a of nonClosedAdjustments) {
    const dateStr = a.date.toISOString().slice(0, 10)
    const original = targets.get(dateStr) ?? 0
    const newAmount = Number(a.adjustedTargetAmount ?? 0)
    totalDelta += newAmount - original
    targets.set(dateStr, newAmount)
  }
  if (totalDelta !== 0) {
    const adjustedDates = new Set(nonClosedAdjustments.map((a) => a.date.toISOString().slice(0, 10)))
    const unadjusted = tradingDays.filter((d) => !adjustedDates.has(d.dateStr))
    const unadjustedWeightTotal = unadjusted.reduce((sum, d) => sum + weights[d.weekday], 0)
    if (unadjustedWeightTotal > 0) {
      for (const { dateStr, weekday } of unadjusted) {
        const share = (weights[weekday] / unadjustedWeightTotal) * totalDelta
        targets.set(dateStr, (targets.get(dateStr) ?? 0) - share)
      }
    }
  }

  return { targets, approvedMonthlyTarget, tradingDaysInMonth: tradingDays.length }
}

/** Convenience: just today's target amount, for the POS widget. */
export async function calculateTodayTarget(businessId: string, approvedMonthlyTarget: number): Promise<number> {
  const now = new Date()
  const { targets } = await calculateDailyTargetsForMonth({ businessId, year: now.getFullYear(), month: now.getMonth() + 1, approvedMonthlyTarget })
  const todayStr = now.toISOString().slice(0, 10)
  return targets.get(todayStr) ?? 0
}
