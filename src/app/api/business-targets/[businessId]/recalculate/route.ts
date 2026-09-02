import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { recalculateBusinessTarget } from '@/lib/business-targets/recalculate-target'

/**
 * POST /api/business-targets/[businessId]/recalculate
 *
 * MBM-288 §6 — force-refreshes minimumRequiredMonthlyTarget and
 * recommendedMonthlyTarget now, instead of waiting for the nightly job
 * (recalculate-all-targets-scheduler.ts, run via node-cron — shares the
 * exact same underlying logic as this endpoint via recalculate-target.ts).
 * Never touches approvedMonthlyTarget except to auto-accept the
 * recommendation the very first time a business is calculated — see plan §4.3.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const config = await prisma.businessTargetConfig.findUnique({ where: { businessId } })
    if (!config) return NextResponse.json({ error: 'Target tracking is not configured for this business yet' }, { status: 404 })

    const { result, updated } = await recalculateBusinessTarget(businessId, user.id)

    return NextResponse.json({
      success: true,
      data: { ...result, approvedMonthlyTarget: updated.approvedMonthlyTarget ? Number(updated.approvedMonthlyTarget) : null },
    })
  } catch (error) {
    console.error('Error recalculating business target:', error)
    return NextResponse.json({ error: 'Failed to recalculate target' }, { status: 500 })
  }
}
