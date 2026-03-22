import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/stock-take/reports?businessId=&status=&page=&limit=
 *
 * Lists stock take reports. Requires canAccessFinancialData or system admin.
 * Also accessible to employees who are responsible on any of the reports (filtered server-side).
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = request.nextUrl
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status')
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20)))

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const canViewAll = isSystemAdmin(user) || hasPermission(user, 'canAccessFinancialData', businessId)

    const where: any = { businessId }
    if (status) where.status = status

    // Non-financial users can only see reports they're a responsible employee on
    if (!canViewAll) {
      // Find the employee record linked to this user (by email)
      const employee = await prisma.employees.findFirst({
        where: { email: user.email, primaryBusinessId: businessId, isActive: true },
        select: { id: true },
      })
      if (!employee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      where.employees = { some: { employeeId: employee.id } }
    }

    const [reports, total] = await Promise.all([
      prisma.stockTakeReports.findMany({
        where,
        include: {
          submittedBy: { select: { id: true, name: true } },
          managerSignedBy: { select: { id: true, name: true } },
          employees: {
            include: {
              employee: { select: { id: true, fullName: true, employeeNumber: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockTakeReports.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: reports,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('[stock-take/reports GET]', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}
