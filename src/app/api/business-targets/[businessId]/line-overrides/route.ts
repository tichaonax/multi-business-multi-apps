import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { calculateMinimumTarget } from '@/lib/business-targets/calculate-minimum-target'

const LINES = {
  RENT: { field: 'rentMonthlyOverride', liveKey: 'rentMonthlyLive', changeType: 'RENT_OVERRIDE', label: 'Rent' },
  PAYROLL: { field: 'payrollMonthlyOverride', liveKey: 'payrollMonthlyLive', changeType: 'PAYROLL_OVERRIDE', label: 'Payroll' },
  RECURRING_COMMITMENTS: {
    field: 'recurringCommitmentsMonthlyOverride',
    liveKey: 'recurringCommitmentsMonthlyLive',
    changeType: 'RECURRING_COMMITMENTS_OVERRIDE',
    label: 'Recurring commitments',
  },
} as const

type LineKey = keyof typeof LINES

/**
 * PUT /api/business-targets/[businessId]/line-overrides
 *
 * Follow-up to MBM-288 §3.1: rent, payroll, and recurring commitments are
 * normally computed live and can never be stored stale — but a business's
 * true obligation can legitimately run ahead of what's on file yet (e.g. a
 * salary increase not yet reflected in EmployeeContracts). This lets an
 * admin manually raise one of those 3 lines. It can never be used to
 * *understate* the minimum: a value below the current live-computed figure
 * is rejected, same hard-floor spirit as the overall approved-target
 * validation (§4.1). Body: { line: 'RENT' | 'PAYROLL' | 'RECURRING_COMMITMENTS', value: number | null }
 * — value: null clears the override, reverting to the live-computed value.
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
    const line = payload.line as LineKey
    if (!(line in LINES)) {
      return NextResponse.json({ error: 'line must be RENT, PAYROLL, or RECURRING_COMMITMENTS' }, { status: 400 })
    }
    const meta = LINES[line]

    const previousValue = (config as any)[meta.field] != null ? Number((config as any)[meta.field]) : null

    let newValue: number | null = null
    if (payload.value !== null && payload.value !== undefined) {
      const v = Number(payload.value)
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'value must be a non-negative number, or null to clear the override' }, { status: 400 })
      }
      // Check against the live figure, not a possibly-stale cached one.
      const live = await calculateMinimumTarget({ businessId })
      const liveValue = (live as any)[meta.liveKey] as number
      if (v < liveValue) {
        return NextResponse.json(
          {
            error: `${meta.label} cannot be set below the system-computed amount ($${liveValue.toFixed(2)}) — an override can only raise this line, never understate it.`,
            liveValue,
          },
          { status: 400 }
        )
      }
      newValue = v
    }

    const updated = await prisma.businessTargetConfig.update({
      where: { businessId },
      data: { [meta.field]: newValue, updatedBy: user.id },
    })

    await Promise.all([
      prisma.businessTargetOverrideHistory.create({
        data: {
          businessId,
          changeType: meta.changeType,
          previousValue,
          newValue,
          reason: newValue === null ? `${meta.label} override cleared` : null,
          changedBy: user.id,
        },
      }),
      prisma.auditLogs.create({
        data: {
          action: 'BUSINESS_TARGET_LINE_OVERRIDDEN',
          entityType: 'BusinessTargetConfig',
          entityId: updated.id,
          userId: user.id,
          details: { businessId, line, previousValue, newValue },
        } as any,
      }),
    ])

    return NextResponse.json({ success: true, data: { line, value: newValue } })
  } catch (error) {
    console.error('Error setting business target line override:', error)
    return NextResponse.json({ error: 'Failed to set line override' }, { status: 500 })
  }
}
