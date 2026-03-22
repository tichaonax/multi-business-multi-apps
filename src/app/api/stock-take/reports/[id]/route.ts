import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/stock-take/reports/[id]
 *
 * Returns full report detail including all employee sign-off rows.
 * Accessible to: canAccessFinancialData users OR responsible employees on this report.
 */

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params

    const report = await prisma.stockTakeReports.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { id: true, name: true } },
        managerSignedBy: { select: { id: true, name: true } },
        employees: {
          include: {
            employee: { select: { id: true, fullName: true, employeeNumber: true, primaryBusinessId: true } },
            signedByUser: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const canViewAll = isSystemAdmin(user) || hasPermission(user, 'canAccessFinancialData', report.businessId)

    if (!canViewAll) {
      // Check if user is a responsible employee on this report
      const employee = await prisma.employees.findFirst({
        where: { email: user.email, primaryBusinessId: report.businessId, isActive: true },
        select: { id: true },
      })
      const isResponsible = employee && report.employees.some(e => e.employeeId === employee.id)
      if (!isResponsible) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: report })
  } catch (error) {
    console.error('[stock-take/reports/[id] GET]', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
