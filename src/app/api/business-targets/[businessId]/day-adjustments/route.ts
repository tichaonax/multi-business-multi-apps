import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET/POST /api/business-targets/[businessId]/day-adjustments — MBM-288 §2.4/§3.3.
 * Manual per-day overrides (closed days, promotions, shortages). Query
 * params on GET: month=YYYY-MM to scope to one month (optional).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // YYYY-MM
    const where: any = { businessId }
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number)
      if (!y || !m) return NextResponse.json({ error: 'month must be in YYYY-MM format' }, { status: 400 })
      where.date = { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) }
    }

    const adjustments = await prisma.businessTargetDayAdjustment.findMany({ where, orderBy: { date: 'asc' } })
    return NextResponse.json({
      success: true,
      data: adjustments.map((a) => ({ ...a, adjustedTargetAmount: a.adjustedTargetAmount ? Number(a.adjustedTargetAmount) : null })),
    })
  } catch (error) {
    console.error('Error fetching day adjustments:', error)
    return NextResponse.json({ error: 'Failed to fetch day adjustments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { id: true } })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const payload = await request.json()
    const { date, adjustmentType, adjustedTargetAmount, reason } = payload

    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })
    if (!['CLOSED', 'BOOST', 'REDUCTION', 'CUSTOM'].includes(adjustmentType)) {
      return NextResponse.json({ error: 'adjustmentType must be CLOSED, BOOST, REDUCTION, or CUSTOM' }, { status: 400 })
    }
    if (adjustmentType !== 'CLOSED') {
      const amount = Number(adjustedTargetAmount)
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({ error: 'adjustedTargetAmount must be a non-negative number for this adjustment type' }, { status: 400 })
      }
    }

    const existing = await prisma.businessTargetDayAdjustment.findUnique({ where: { businessId_date: { businessId, date: new Date(date) } } })
    if (existing) {
      return NextResponse.json({ error: 'An adjustment already exists for this date — delete it first to replace it' }, { status: 409 })
    }

    const adjustment = await prisma.businessTargetDayAdjustment.create({
      data: {
        businessId,
        date: new Date(date),
        adjustmentType,
        adjustedTargetAmount: adjustmentType === 'CLOSED' ? null : Number(adjustedTargetAmount),
        reason: reason?.trim() || null,
        createdBy: user.id,
      },
    })

    await prisma.auditLogs.create({
      data: {
        action: 'BUSINESS_TARGET_DAY_ADJUSTED',
        entityType: 'BusinessTargetDayAdjustment',
        entityId: adjustment.id,
        userId: user.id,
        details: { businessId, date, adjustmentType, adjustedTargetAmount: adjustmentType === 'CLOSED' ? null : Number(adjustedTargetAmount), reason: reason?.trim() || null },
      } as any,
    })

    return NextResponse.json({ success: true, data: { ...adjustment, adjustedTargetAmount: adjustment.adjustedTargetAmount ? Number(adjustment.adjustedTargetAmount) : null } }, { status: 201 })
  } catch (error) {
    console.error('Error creating day adjustment:', error)
    return NextResponse.json({ error: 'Failed to create day adjustment' }, { status: 500 })
  }
}
