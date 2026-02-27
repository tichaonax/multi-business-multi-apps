import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/clock-in/reports?dateFrom=&dateTo=&employeeId=&businessId=
// Returns attendance records for a date range, with per-employee aggregates
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const employeeId = searchParams.get('employeeId')
    const businessId = searchParams.get('businessId')

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'dateFrom and dateTo are required' }, { status: 400 })
    }

    const from = new Date(dateFrom)
    from.setHours(0, 0, 0, 0)
    const to = new Date(dateTo)
    to.setHours(23, 59, 59, 999)

    const records = await prisma.employeeAttendance.findMany({
      where: {
        date: { gte: from, lte: to },
        ...(employeeId ? { employeeId } : {}),
        employees: {
          isActive: true,
          ...(businessId ? { primaryBusinessId: businessId } : {}),
        },
      },
      include: {
        employees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            scheduledStartTime: true,
            scheduledEndTime: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { employees: { fullName: 'asc' } }],
    })

    // Build per-employee aggregates
    const empMap: Record<string, {
      employee: { id: string; fullName: string; employeeNumber: string; scheduledStartTime: string | null; scheduledEndTime: string | null }
      totalDays: number
      lateDays: number
      totalHours: number
      totalLateMinutes: number
      records: typeof records
    }> = {}

    for (const rec of records) {
      const emp = rec.employees
      if (!empMap[emp.id]) {
        empMap[emp.id] = { employee: emp, totalDays: 0, lateDays: 0, totalHours: 0, totalLateMinutes: 0, records: [] }
      }
      const agg = empMap[emp.id]
      agg.totalDays++
      agg.totalHours += Number(rec.hoursWorked ?? 0)
      agg.records.push(rec)

      // Calculate lateness
      if (rec.checkIn && emp.scheduledStartTime) {
        const [sh, sm] = emp.scheduledStartTime.split(':').map(Number)
        const scheduled = new Date(rec.checkIn)
        scheduled.setHours(sh, sm, 0, 0)
        const lateMs = (rec.checkIn as Date).getTime() - scheduled.getTime()
        if (lateMs > 0) {
          agg.lateDays++
          agg.totalLateMinutes += Math.round(lateMs / 60000)
        }
      }
    }

    const employees = Object.values(empMap).map(({ employee, totalDays, lateDays, totalHours, totalLateMinutes, records: empRecords }) => ({
      employee,
      totalDays,
      lateDays,
      totalHours: Math.round(totalHours * 100) / 100,
      avgLateMinutes: lateDays > 0 ? Math.round(totalLateMinutes / lateDays) : 0,
      punctualityScore: totalDays > 0 ? Math.round(((totalDays - lateDays) / totalDays) * 100) : 100,
      records: empRecords.map((r: (typeof empRecords)[number]) => ({
        id: r.id,
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        hoursWorked: r.hoursWorked,
        isAutoClockOut: r.isAutoClockOut,
        isApproved: r.isApproved,
        status: r.status,
      })),
    }))

    return NextResponse.json({ employees, totalRecords: records.length })
  } catch (error) {
    console.error('Clock-in reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
