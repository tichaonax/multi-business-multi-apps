import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/clock-in/today?businessId=...
// Returns all active non-exempt employees with today's attendance status
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const employees = await prisma.employees.findMany({
      where: {
        isActive: true,
        isClockInExempt: false,
        ...(businessId ? { primaryBusinessId: businessId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        profilePhotoUrl: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        phone: true,
        businesses: {
          select: { id: true, name: true },
        },
        job_titles: {
          select: { title: true, department: true },
        },
        employee_attendance: {
          where: { date: { gte: todayStart, lte: todayEnd } },
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            hoursWorked: true,
            isAutoClockOut: true,
            isApproved: true,
            status: true,
            clockInPhotoUrl: true,
            clockOutPhotoUrl: true,
          },
          take: 1,
        },
      },
      orderBy: { fullName: 'asc' },
    })

    const result = employees.map((emp: (typeof employees)[number]) => {
      const att = emp.employee_attendance[0] ?? null
      let clockState: 'notYetClockedIn' | 'clockedIn' | 'clockedOut' = 'notYetClockedIn'
      if (att?.checkIn && att?.checkOut) clockState = 'clockedOut'
      else if (att?.checkIn) clockState = 'clockedIn'

      // Determine late status
      let isLate = false
      if (att?.checkIn && emp.scheduledStartTime) {
        const [sh, sm] = emp.scheduledStartTime.split(':').map(Number)
        const scheduled = new Date(att.checkIn)
        scheduled.setHours(sh, sm, 0, 0)
        isLate = (att.checkIn as Date) > scheduled
      }

      return {
        ...emp,
        employee_attendance: undefined,
        businesses: undefined,
        job_titles: undefined,
        primaryBusiness: emp.businesses ?? null,
        jobTitle: emp.job_titles ?? null,
        attendance: att,
        clockState,
        isLate,
      }
    })

    type ResultItem = (typeof result)[number]

    // Summary stats
    const summary = {
      total: result.length,
      present: result.filter((e: ResultItem) => e.clockState !== 'notYetClockedIn').length,
      late: result.filter((e: ResultItem) => e.isLate).length,
      notYetClockedIn: result.filter((e: ResultItem) => e.clockState === 'notYetClockedIn').length,
      pendingAutoClockOut: result.filter((e: ResultItem) => e.attendance?.isAutoClockOut && !e.attendance?.isApproved).length,
    }

    return NextResponse.json({ employees: result, summary })
  } catch (error) {
    console.error('Clock-in today error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
