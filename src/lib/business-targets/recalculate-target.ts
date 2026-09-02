import { prisma } from '@/lib/prisma'
import { calculateRecommendedTarget } from './calculate-recommended-target'

const RECALCULATION_HISTORY_THRESHOLD_PCT = 2 // don't log cent-level drift, only moves > 2%

/**
 * Shared by the on-demand `/recalculate` endpoint and the nightly cron job
 * (recalculate-all-targets-scheduler.ts) — one implementation so the two
 * can't drift apart. Refreshes minimumRequiredMonthlyTarget and
 * recommendedMonthlyTarget.
 *
 * approvedMonthlyTarget auto-accepts the recommendation the first time a
 * business is calculated (plan §4.3), and keeps following it on every
 * later recalculation for as long as the admin hasn't manually diverged it
 * from the recommendation — e.g. after a line override changes payroll and
 * the minimum/recommended move, "Set approved monthly target" updates to
 * match rather than being left showing a now-stale figure. The moment an
 * admin sets an approved value that differs from the recommendation
 * (a deliberate override), this stops touching it — same "never silently
 * overwrite a deliberate decision" guarantee as before, just no longer
 * limited to the very first calculation.
 */
export async function recalculateBusinessTarget(businessId: string, actingUserId: string) {
  const config = await prisma.businessTargetConfig.findUnique({ where: { businessId } })
  if (!config) throw new Error(`No BusinessTargetConfig for business ${businessId}`)

  const result = await calculateRecommendedTarget({ businessId })
  const previousRecommended = config.recommendedMonthlyTarget ? Number(config.recommendedMonthlyTarget) : null
  const previousApproved = config.approvedMonthlyTarget !== null ? Number(config.approvedMonthlyTarget) : null
  const isAutoFollowingRecommendation = previousApproved === null || (previousRecommended !== null && Math.abs(previousApproved - previousRecommended) < 0.005)

  const updated = await prisma.businessTargetConfig.update({
    where: { businessId },
    data: {
      minimumRequiredMonthlyTarget: result.minimumRequiredMonthlyTarget,
      recommendedMonthlyTarget: result.recommendedMonthlyTarget,
      lastCalculatedAt: new Date(),
      ...(isAutoFollowingRecommendation ? { approvedMonthlyTarget: result.recommendedMonthlyTarget } : {}),
    },
  })

  const movedMeaningfully =
    previousRecommended === null ||
    (Math.abs(result.recommendedMonthlyTarget - previousRecommended) / Math.max(previousRecommended, 1)) * 100 > RECALCULATION_HISTORY_THRESHOLD_PCT
  if (movedMeaningfully) {
    await prisma.businessTargetOverrideHistory.create({
      data: {
        businessId,
        changeType: 'RECALCULATION',
        previousValue: previousRecommended,
        newValue: result.recommendedMonthlyTarget,
        breakdownSnapshot: result as any,
        changedBy: actingUserId,
      },
    })
  }

  return { result, updated }
}
