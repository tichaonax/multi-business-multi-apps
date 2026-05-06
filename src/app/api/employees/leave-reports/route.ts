import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

/**
 * GET /api/employees/leave-reports?businessId=
 *
 * Returns three report datasets:
 *   - currentlyOnLeave: employees on approved leave right now
 *   - sickLeaveUsage: all employees with leave balance for current year
 *   - sickOverflow: employees who used more sick days than their allocation
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
    const year = today.getFullYear()

    // Report 1: Currently on leave
    let onLeaveRows: any[]
    if (businessIds.length > 0) {
      onLeaveRows = await prisma.$queryRaw`
        SELECT
          lr.id AS "leaveRequestId",
          lr."leaveType",
          lr."startDate",
          lr."endDate",
          lr."daysRequested",
          e.id AS "employeeId",
          e."fullName" AS "employeeName",
          e."employeeNumber"
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
      onLeaveRows = await prisma.$queryRaw`
        SELECT
          lr.id AS "leaveRequestId",
          lr."leaveType",
          lr."startDate",
          lr."endDate",
          lr."daysRequested",
          e.id AS "employeeId",
          e."fullName" AS "employeeName",
          e."employeeNumber"
        FROM employee_leave_requests lr
        JOIN employees e ON e.id = lr."employeeId"
        WHERE lr.status = 'approved'
          AND lr."startDate" <= ${today}
          AND lr."endDate"   >= ${today}
          AND lr."actualReturnDate" IS NULL
        ORDER BY lr."startDate" DESC
      `
    }

    // Reports 2 & 3: Sick leave usage and overflow (from leave balance table)
    let balanceRows: any[]
    if (businessIds.length > 0) {
      balanceRows = await prisma.$queryRaw`
        SELECT
          lb.id,
          lb."employeeId",
          lb."sickLeaveDays" AS allocated,
          lb."usedSickDays"  AS used,
          lb."remainingSick" AS remaining,
          e."fullName"       AS "employeeName",
          e."employeeNumber"
        FROM employee_leave_balances lb
        JOIN employees e ON e.id = lb."employeeId"
        WHERE lb.year = ${year}
          AND e."primaryBusinessId" = ANY(${businessIds}::text[])
        ORDER BY lb."usedSickDays" DESC
      `
    } else {
      balanceRows = await prisma.$queryRaw`
        SELECT
          lb.id,
          lb."employeeId",
          lb."sickLeaveDays" AS allocated,
          lb."usedSickDays"  AS used,
          lb."remainingSick" AS remaining,
          e."fullName"       AS "employeeName",
          e."employeeNumber"
        FROM employee_leave_balances lb
        JOIN employees e ON e.id = lb."employeeId"
        WHERE lb.year = ${year}
        ORDER BY lb."usedSickDays" DESC
      `
    }

    const sickLeaveUsage = (balanceRows as any[]).map(r => ({
      employeeId: r.employeeId,
      employeeName: r.employeeName ?? 'Unknown',
      employeeNumber: r.employeeNumber ?? null,
      allocated: Number(r.allocated ?? 0),
      used: Number(r.used ?? 0),
      remaining: Number(r.remaining ?? 0),
      isNearLimit: Number(r.used ?? 0) >= Number(r.allocated ?? 1) * 0.8,
    }))

    const sickOverflow = sickLeaveUsage
      .filter(r => r.used > r.allocated)
      .map(r => ({
        ...r,
        overflowDays: r.used - r.allocated,
      }))

    return NextResponse.json({
      currentlyOnLeave: (onLeaveRows as any[]).map(r => ({
        leaveRequestId: r.leaveRequestId,
        employeeId: r.employeeId,
        employeeName: r.employeeName ?? 'Unknown',
        employeeNumber: r.employeeNumber ?? null,
        leaveType: r.leaveType,
        startDate: r.startDate,
        endDate: r.endDate,
        daysRequested: Number(r.daysRequested),
      })),
      sickLeaveUsage,
      sickOverflow,
    })
  } catch (error) {
    console.error('Leave reports error:', error)
    return NextResponse.json({ error: 'Failed to fetch leave reports' }, { status: 500 })
  }
}
