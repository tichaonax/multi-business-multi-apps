import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/** DELETE /api/business-targets/[businessId]/day-adjustments/[adjustmentId] — MBM-288 §2.4 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ businessId: string; adjustmentId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, adjustmentId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.businessTargetDayAdjustment.findUnique({ where: { id: adjustmentId } })
    if (!existing || existing.businessId !== businessId) {
      return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 })
    }

    await prisma.businessTargetDayAdjustment.delete({ where: { id: adjustmentId } })

    await prisma.auditLogs.create({
      data: {
        action: 'BUSINESS_TARGET_DAY_ADJUSTED',
        entityType: 'BusinessTargetDayAdjustment',
        entityId: existing.id,
        userId: user.id,
        details: { businessId, action: 'removed', date: existing.date, adjustmentType: existing.adjustmentType },
      } as any,
    })

    return NextResponse.json({ success: true, message: 'Adjustment removed' })
  } catch (error) {
    console.error('Error deleting day adjustment:', error)
    return NextResponse.json({ error: 'Failed to remove day adjustment' }, { status: 500 })
  }
}
