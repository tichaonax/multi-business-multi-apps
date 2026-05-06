import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

/**
 * GET /api/employees/leave-status?businessId=
 *
 * Returns all employees currently on approved leave:
 *   status = 'approved', startDate ≤ today ≤ endDate, actualReturnDate IS NULL
 *
 * Supports umbrella businesses — includes all child businesses automatically.
 *
 * Response: { onLeave: LeaveStatusEntry[] }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canAccessPayroll') && !hasPermission(user, 'canManageEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    // Resolve business IDs to scope the query (umbrella → include children)
    let businessIds: string[] = []
    if (businessId) {
      const biz = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: { id: true, isUmbrellaBusiness: true } as any,
      })
      if (biz) {
        if ((biz as any).isUmbrellaBusiness) {
          const children = await prisma.businesses.findMany({
            where: { umbrellaBusinessId: businessId },
            select: { id: true },
          })
          businessIds = [businessId, ...children.map((c: any) => c.id)]
        } else {
          businessIds = [businessId]
        }
      }
    }

    const today = new Date()

    // Raw SQL — camelCase column names match the DB schema
    let rows: any[]
    if (businessIds.length > 0) {
      rows = await prisma.$queryRaw`
        SELECT
          lr.id                    AS "leaveRequestId",
          lr."leaveType",
          lr."startDate",
          lr."endDate",
          lr."daysRequested",
          e.id                     AS "employeeId",
          e."fullName"             AS "employeeName",
          e."employeeNumber",
          e."primaryBusinessId"
        FROM employee_leave_requests lr
        JOIN employees e ON e.id = lr."employeeId"
        WHERE lr.status = 'approved'
          AND lr."startDate" <= ${today}
          AND lr."endDate"   >= ${today}
          AND lr."actualReturnDate" IS NULL
          AND e."primaryBusinessId" = ANY(${businessIds}::text[])
        ORDER BY lr."startDate" DESC
      `
    } else {
      rows = await prisma.$queryRaw`
        SELECT
          lr.id                    AS "leaveRequestId",
          lr."leaveType",
          lr."startDate",
          lr."endDate",
          lr."daysRequested",
          e.id                     AS "employeeId",
          e."fullName"             AS "employeeName",
          e."employeeNumber",
          e."primaryBusinessId"
        FROM employee_leave_requests lr
        JOIN employees e ON e.id = lr."employeeId"
        WHERE lr.status = 'approved'
          AND lr."startDate" <= ${today}
          AND lr."endDate"   >= ${today}
          AND lr."actualReturnDate" IS NULL
        ORDER BY lr."startDate" DESC
      `
    }

    const onLeave = (rows as any[]).map((r) => ({
      leaveRequestId: r.leaveRequestId,
      employeeId: r.employeeId,
      employeeName: r.employeeName ?? 'Unknown',
      employeeNumber: r.employeeNumber ?? null,
      leaveType: r.leaveType,      // 'annual' | 'sick'
      startDate: r.startDate,
      endDate: r.endDate,
      daysRequested: Number(r.daysRequested),
    }))

    return NextResponse.json({ onLeave })
  } catch (error) {
    console.error('Leave status fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch leave status' }, { status: 500 })
  }
}
