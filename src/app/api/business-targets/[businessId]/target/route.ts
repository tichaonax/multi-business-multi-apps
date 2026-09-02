import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { calculateMinimumTarget } from '@/lib/business-targets/calculate-minimum-target'

/**
 * PUT /api/business-targets/[businessId]/target
 *
 * MBM-288 §4 — sets the approved monthly target. Body: { monthlyTarget, reason? }
 *
 * §4.1 hard floor: rejected below the current minimum, with the exact
 * spec-quoted explanation.
 * §4.2 soft ceiling: allowed above the recommendation, but requires a
 * `reason` and is recorded (user, date, previous/new value, reason).
 * Anything between the minimum and the recommendation needs no reason.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const config = await prisma.businessTargetConfig.findUnique({ where: { businessId } })
    if (!config) return NextResponse.json({ error: 'Target tracking is not configured for this business yet' }, { status: 404 })

    const payload = await request.json()
    const monthlyTarget = Number(payload.monthlyTarget)
    if (!Number.isFinite(monthlyTarget) || monthlyTarget <= 0) {
      return NextResponse.json({ error: 'monthlyTarget must be a positive number' }, { status: 400 })
    }

    // Always check against a freshly-computed minimum, not the (possibly
    // stale, up-to-a-day-old) cached figure — the floor must be real at the
    // moment of the decision, not whatever the nightly job last saw.
    const minimum = await calculateMinimumTarget({ businessId })
    if (monthlyTarget < minimum.minimumRequiredMonthlyTarget) {
      return NextResponse.json(
        {
          error:
            'The target cannot be lower than the minimum required monthly amount because it would not cover rent, salaries, loan repayments, recurring commitments, and the required buffer.',
          minimumRequiredMonthlyTarget: minimum.minimumRequiredMonthlyTarget,
        },
        { status: 400 }
      )
    }

    const recommended = config.recommendedMonthlyTarget ? Number(config.recommendedMonthlyTarget) : minimum.minimumRequiredMonthlyTarget
    const isAboveRecommendation = monthlyTarget > recommended + 0.005
    const reason: string | undefined = payload.reason?.trim()
    if (isAboveRecommendation && !reason) {
      return NextResponse.json(
        { error: 'A reason is required when setting a target above the recommended amount.' },
        { status: 400 }
      )
    }

    const previousValue = config.approvedMonthlyTarget ? Number(config.approvedMonthlyTarget) : null

    const updated = await prisma.businessTargetConfig.update({
      where: { businessId },
      data: { approvedMonthlyTarget: monthlyTarget, minimumRequiredMonthlyTarget: minimum.minimumRequiredMonthlyTarget, updatedBy: user.id },
    })

    await Promise.all([
      prisma.businessTargetOverrideHistory.create({
        data: {
          businessId,
          changeType: 'TARGET_OVERRIDE',
          previousValue,
          newValue: monthlyTarget,
          reason: reason || null,
          breakdownSnapshot: minimum as any,
          changedBy: user.id,
        },
      }),
      prisma.auditLogs.create({
        data: {
          action: 'BUSINESS_TARGET_OVERRIDDEN',
          entityType: 'BusinessTargetConfig',
          entityId: updated.id,
          userId: user.id,
          details: { businessId, previousValue, newValue: monthlyTarget, reason: reason || null, isAboveRecommendation },
        } as any,
      }),
    ])

    return NextResponse.json({ success: true, data: { ...updated, approvedMonthlyTarget: monthlyTarget } })
  } catch (error) {
    console.error('Error setting business target:', error)
    return NextResponse.json({ error: 'Failed to set target' }, { status: 500 })
  }
}
