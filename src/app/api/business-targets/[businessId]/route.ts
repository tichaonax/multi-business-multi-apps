import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { calculateMinimumTarget } from '@/lib/business-targets/calculate-minimum-target'
import { calculateLineContributions } from '@/lib/business-targets/calculate-line-contributions'

/**
 * GET /api/business-targets/[businessId]
 *
 * MBM-288 §6/§8 — response shape is permission-gated: an operational-tier
 * user (`canViewBusinessTargetProgress` only) gets the numbers needed for
 * the POS widget/expanded view; an admin-tier user (`canManageBusinessTargets`)
 * additionally gets the full commitment breakdown and calculation
 * assumptions. This is enforced here in what's actually returned, not just
 * hidden client-side.
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
    if (!config || !config.isEnabled) {
      return NextResponse.json({ success: true, data: { isEnabled: false } })
    }

    const base = {
      isEnabled: true,
      approvedMonthlyTarget: config.approvedMonthlyTarget ? Number(config.approvedMonthlyTarget) : null,
      recommendedMonthlyTarget: config.recommendedMonthlyTarget ? Number(config.recommendedMonthlyTarget) : null,
      minimumRequiredMonthlyTarget: config.minimumRequiredMonthlyTarget ? Number(config.minimumRequiredMonthlyTarget) : null,
      lastCalculatedAt: config.lastCalculatedAt,
    }

    if (!canManage) {
      // Operational tier: numbers only, no breakdown of what makes them up.
      return NextResponse.json({ success: true, data: base })
    }

    const [commitments, breakdown] = await Promise.all([
      prisma.businessTargetCommitment.findMany({ where: { businessId, isActive: true }, orderBy: { createdAt: 'asc' } }),
      calculateMinimumTarget({ businessId }),
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
      },
    })
  } catch (error) {
    console.error('Error fetching business target config:', error)
    return NextResponse.json({ error: 'Failed to fetch business target config' }, { status: 500 })
  }
}

/**
 * PUT /api/business-targets/[businessId]
 * Enable/disable target tracking, or change the buffer. Body: { isEnabled?, bufferType?, bufferValue? }
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const admin = isSystemAdmin(user)
    if (!admin && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { id: true } })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const payload = await request.json()
    const existing = await prisma.businessTargetConfig.findUnique({ where: { businessId } })

    const updateData: any = { updatedBy: user.id }
    let changeType: string | null = null
    let previousValue: number | null = null
    let newValue: number | null = null

    if (payload.hasOwnProperty('isEnabled')) {
      updateData.isEnabled = !!payload.isEnabled
      changeType = payload.isEnabled ? 'ENABLE' : 'DISABLE'
    }
    if (payload.hasOwnProperty('bufferType')) {
      if (!['PERCENT', 'FIXED'].includes(payload.bufferType)) {
        return NextResponse.json({ error: 'bufferType must be PERCENT or FIXED' }, { status: 400 })
      }
      updateData.bufferType = payload.bufferType
    }
    if (payload.hasOwnProperty('bufferValue')) {
      const v = Number(payload.bufferValue)
      if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: 'bufferValue must be a non-negative number' }, { status: 400 })
      previousValue = existing ? Number(existing.bufferValue) : null
      newValue = v
      updateData.bufferValue = v
      if (!changeType) changeType = 'BUFFER_CHANGE'
    }

    const config = existing
      ? await prisma.businessTargetConfig.update({ where: { businessId }, data: updateData })
      : await prisma.businessTargetConfig.create({
          data: {
            businessId,
            isEnabled: !!payload.isEnabled,
            bufferType: payload.bufferType || 'PERCENT',
            bufferValue: payload.bufferValue !== undefined ? Number(payload.bufferValue) : 10,
            createdBy: user.id,
          },
        })

    if (changeType) {
      await Promise.all([
        prisma.businessTargetOverrideHistory.create({
          data: { businessId, changeType, previousValue, newValue, changedBy: user.id },
        }),
        prisma.auditLogs.create({
          data: {
            action: changeType === 'ENABLE' ? 'BUSINESS_TARGET_ENABLED' : changeType === 'DISABLE' ? 'BUSINESS_TARGET_DISABLED' : 'BUSINESS_TARGET_BUFFER_CHANGED',
            entityType: 'BusinessTargetConfig',
            entityId: config.id,
            userId: user.id,
            details: { businessId, previousValue, newValue },
          } as any,
        }),
      ])
    }

    return NextResponse.json({ success: true, data: { ...config, bufferValue: Number(config.bufferValue) } })
  } catch (error) {
    console.error('Error updating business target config:', error)
    return NextResponse.json({ error: 'Failed to update business target config' }, { status: 500 })
  }
}
