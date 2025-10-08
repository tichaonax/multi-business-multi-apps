import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness, SessionUser, hasPermission } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

// PUT /api/payroll/periods/[periodId]/reset-to-preview
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params
    const user = session.user as SessionUser

    // Load period and business
    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId }, include: { business: { select: { id: true, name: true } } } })
    if (!period) return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 })

    // Only exported periods can be reset
    if (period.status !== 'exported') {
      return NextResponse.json({ error: 'Payroll period is not in exported state' }, { status: 400 })
    }

    // Check 7-day window from exportedAt
    if (!period.exportedAt) {
      return NextResponse.json({ error: 'Payroll period missing exportedAt timestamp' }, { status: 400 })
    }

    const exportedAt = new Date(period.exportedAt as any)
    const cutoff = new Date(exportedAt)
    cutoff.setDate(cutoff.getDate() + 7)
    if (new Date() > cutoff) {
      return NextResponse.json({ error: 'Reset window expired (must reset within 7 days of export)' }, { status: 400 })
    }

    // Authorization: system admins OR business-manager with specific permission
    const admin = isSystemAdmin(user)
    if (!admin) {
      // Ensure user has business membership and role
      const role = getUserRoleInBusiness(user, period.business.id)
      if (role !== 'business-manager' && role !== 'business-owner') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      // Check explicit permission on membership
      const hasResetPermission = hasPermission(user, 'canResetExportedPayrollToPreview', period.business.id)
      if (!hasResetPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // All checks passed - perform the reset inside a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update period back to review (or preview). Use 'review' to match existing workflow.
      const p = await tx.payrollPeriod.update({ where: { id: periodId }, data: { status: 'review', updatedAt: new Date() } })
      return p
    })

    return NextResponse.json({ success: true, period: updated })
  } catch (error) {
    console.error('Failed to reset payroll period to preview:', error)
    return NextResponse.json({ error: 'Failed to reset payroll period' }, { status: 500 })
  }
}
