import { prisma } from '@/lib/prisma'
import { calculateMinimumTarget } from './calculate-minimum-target'

/**
 * MBM-288 §3.2 — the recommended monthly target: the greater of the minimum
 * required (§3.1) and a historically-informed projection. Deliberately the
 * simplest defensible version — a transparent, auditable formula, not a
 * forecasting model (plan §7, decision 3: accepted as proposed).
 *
 * New-business fallback (plan §4.4): fewer than 90 days of COMPLETED order
 * history skips the historical projection entirely and recommends the
 * minimum plus a flat uplift instead — labeled as an estimate, not a
 * data-driven figure.
 */

const NEW_BUSINESS_MIN_HISTORY_DAYS = 90
const NEW_BUSINESS_UPLIFT_MULTIPLIER = 1.15
const SEASONAL_MIN_HISTORY_MONTHS = 12

export interface RecommendedTargetResult {
  recommendedMonthlyTarget: number
  minimumRequiredMonthlyTarget: number
  isNewBusinessEstimate: boolean
  baselineAvgMonthlySales: number | null
  seasonalAdjustmentFactor: number
  growthTrendFactor: number
  achievementAdjustmentFactor: number
}

function monthsAgo(n: number, from: Date = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth() - n, 1)
}

async function sumCompletedSales(businessId: string, start: Date, end: Date): Promise<number> {
  const agg = await prisma.businessOrders.aggregate({
    where: { businessId, status: 'COMPLETED', paymentMethod: { not: 'EXPENSE_ACCOUNT' as any }, createdAt: { gte: start, lt: end } },
    _sum: { totalAmount: true },
  })
  return Number(agg._sum.totalAmount || 0)
}

export async function calculateRecommendedTarget(params: {
  businessId: string
  year?: number
  month?: number
}): Promise<RecommendedTargetResult> {
  const now = new Date()
  const year = params.year ?? now.getFullYear()
  const month = params.month ?? now.getMonth() + 1
  const { businessId } = params

  const minimum = await calculateMinimumTarget({ businessId, year, month })

  const oldestOrder = await prisma.businessOrders.findFirst({
    where: { businessId, status: 'COMPLETED' },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  })
  const historyDays = oldestOrder ? Math.floor((now.getTime() - oldestOrder.createdAt.getTime()) / (24 * 60 * 60 * 1000)) : 0

  if (historyDays < NEW_BUSINESS_MIN_HISTORY_DAYS) {
    return {
      recommendedMonthlyTarget: Math.max(minimum.minimumRequiredMonthlyTarget, minimum.minimumRequiredMonthlyTarget * NEW_BUSINESS_UPLIFT_MULTIPLIER),
      minimumRequiredMonthlyTarget: minimum.minimumRequiredMonthlyTarget,
      isNewBusinessEstimate: true,
      baselineAvgMonthlySales: null,
      seasonalAdjustmentFactor: 1,
      growthTrendFactor: 1,
      achievementAdjustmentFactor: 1,
    }
  }

  // Baseline: trailing 3-month average of COMPLETED sales.
  const trailing3Start = monthsAgo(3, now)
  const trailing3End = monthsAgo(0, now)
  const trailing3Total = await sumCompletedSales(businessId, trailing3Start, trailing3End)
  const baselineAvgMonthlySales = trailing3Total / 3

  // Seasonal factor: this calendar month's historical share of annual sales
  // vs. an average month's share (1/12) — only with >= 12 months of history.
  let seasonalAdjustmentFactor = 1
  if (historyDays >= SEASONAL_MIN_HISTORY_MONTHS * 30) {
    const yearStart = monthsAgo(11, now)
    const yearEnd = monthsAgo(0, now)
    const yearTotal = await sumCompletedSales(businessId, yearStart, yearEnd)
    const targetMonthStart = new Date(year, month - 1, 1)
    // Use last year's same calendar month as the seasonal reference point.
    const seasonalRefStart = new Date(targetMonthStart.getFullYear() - 1, targetMonthStart.getMonth(), 1)
    const seasonalRefEnd = new Date(targetMonthStart.getFullYear() - 1, targetMonthStart.getMonth() + 1, 1)
    const seasonalRefTotal = await sumCompletedSales(businessId, seasonalRefStart, seasonalRefEnd)
    if (yearTotal > 0 && seasonalRefTotal > 0) {
      const monthShare = seasonalRefTotal / yearTotal
      seasonalAdjustmentFactor = monthShare / (1 / 12)
    }
  }

  // Growth trend: recent 3-month average vs. the 3 months before that,
  // clamped to avoid over-extrapolating a short trend.
  const prior3Start = monthsAgo(6, now)
  const prior3End = monthsAgo(3, now)
  const prior3Total = await sumCompletedSales(businessId, prior3Start, prior3End)
  let growthTrendFactor = 1
  if (prior3Total > 0) {
    growthTrendFactor = Math.min(1.25, Math.max(0.85, trailing3Total / prior3Total))
  }

  // Achievement adjustment: trailing 3-period average of actual vs. approved
  // target, from the override-history log's most recent RECALCULATION rows
  // — approximated here via the config's own approvedMonthlyTarget history
  // being out of scope for a first pass; default to neutral (1.0) since a
  // business's first-ever recommendation has no prior approved-target
  // periods to compare against. Refined once real usage data exists (plan §7,
  // decision 3).
  const achievementAdjustmentFactor = 1

  const historicalProjection = baselineAvgMonthlySales * seasonalAdjustmentFactor * growthTrendFactor * achievementAdjustmentFactor

  return {
    recommendedMonthlyTarget: Math.max(minimum.minimumRequiredMonthlyTarget, historicalProjection),
    minimumRequiredMonthlyTarget: minimum.minimumRequiredMonthlyTarget,
    isNewBusinessEstimate: false,
    baselineAvgMonthlySales,
    seasonalAdjustmentFactor,
    growthTrendFactor,
    achievementAdjustmentFactor,
  }
}
