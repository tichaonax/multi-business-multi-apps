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
    const dateParam = searchParams.get('date') // YYYY-MM-DD; defaults to today

    // Build start/end bounds for the requested date (local midnight)
    const baseDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date()
    const todayStart = new Date(baseDate)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(baseDate)
    todayEnd.setHours(23, 59, 59, 999)

    // Job title levels that are automatically exempt (kept in sync with exempt-employees route)
    const MANAGER_LEVELS = ['manager', 'senior', 'executive']

    const employees = await prisma.employees.findMany({
      where: {
        isActive: true,
        isClockInExempt: false,
        // Also exclude employees whose job title is a management level
        NOT: { job_titles: { level: { in: MANAGER_LEVELS, mode: 'insensitive' } } },
        ...(businessId ? { primaryBusinessId: businessId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        scanToken: true,
        profilePhotoUrl: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        phone: true,
        businesses: {
          select: { id: true, name: true, phone: true, umbrellaBusinessPhone: true },
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

    // Fetch umbrella business phone once as final fallback for ID cards
    const umbrellaBiz = await prisma.businesses.findFirst({
      where: { isUmbrellaBusiness: true },
      select: { umbrellaBusinessPhone: true }
    })
    const umbrellaPhone = umbrellaBiz?.umbrellaBusinessPhone ?? null

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

      // Phone priority: business phone → business's umbrella phone → umbrella record phone
      const businessContactPhone = emp.businesses?.phone || emp.businesses?.umbrellaBusinessPhone || umbrellaPhone || null

      return {
        ...emp,
        employee_attendance: undefined,
        businesses: undefined,
        job_titles: undefined,
        primaryBusiness: emp.businesses ?? null,
        jobTitle: emp.job_titles ?? null,
        businessContactPhone,
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
