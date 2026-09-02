import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { calculateTodayTarget } from '@/lib/business-targets/calculate-daily-target'
import { getDayBoundaryInTimezone, getServerDefaultTimezone } from '@/lib/timezone-utils'
import { statusForRatio } from '@/lib/business-targets/target-status'

/**
 * GET /api/business-targets/[businessId]/today
 *
 * MBM-288 §5.1 — the POS compact widget's data source: today's target,
 * actual sales so far, remaining amount, and the Ahead/On Track/Watch/Behind
 * status. Operational tier (`canViewBusinessTargetProgress`) is enough —
 * this endpoint deliberately returns nothing beyond what's needed for the
 * widget, no commitment breakdown.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const admin = isSystemAdmin(user)
    if (!admin && !hasPermission(user, 'canManageBusinessTargets', businessId) && !hasPermission(user, 'canViewBusinessTargetProgress', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const config = await prisma.businessTargetConfig.findUnique({ where: { businessId } })
    if (!config || !config.isEnabled || !config.approvedMonthlyTarget) {
      return NextResponse.json({ success: true, data: { isEnabled: false } })
    }

    const { searchParams } = new URL(request.url)
    const timezone = searchParams.get('timezone') || getServerDefaultTimezone()
    const { start, end } = getDayBoundaryInTimezone(timezone)

    const [dailyTarget, actualAgg] = await Promise.all([
      calculateTodayTarget(businessId, Number(config.approvedMonthlyTarget)),
      prisma.businessOrders.aggregate({
        where: { businessId, status: 'COMPLETED', paymentMethod: { not: 'EXPENSE_ACCOUNT' as any }, createdAt: { gte: start, lt: end } },
        _sum: { totalAmount: true },
      }),
    ])

    const actualToday = Number(actualAgg._sum.totalAmount || 0)
    const fractionOfDayElapsed = Math.min(1, Math.max(0, (Date.now() - start.getTime()) / (end.getTime() - start.getTime())))
    const expectedByNow = dailyTarget * fractionOfDayElapsed
    // Early in the day expectedByNow is ~0 — avoid a meaningless divide,
    // just report against the full daily target instead.
    const ratio = expectedByNow > 0.01 ? actualToday / expectedByNow : dailyTarget > 0 ? actualToday / dailyTarget : 1

    return NextResponse.json({
      success: true,
      data: {
        isEnabled: true,
        dailyTarget,
        actualToday,
        remainingToday: Math.max(0, dailyTarget - actualToday),
        percentAchieved: dailyTarget > 0 ? Math.round((actualToday / dailyTarget) * 100) : 0,
        status: statusForRatio(ratio),
        approvedMonthlyTarget: Number(config.approvedMonthlyTarget),
      },
    })
  } catch (error) {
    console.error('Error fetching today target:', error)
    return NextResponse.json({ error: 'Failed to fetch today target' }, { status: 500 })
  }
}
