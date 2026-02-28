import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// POST /api/clock-in/scan
// Body: { employeeNumber: string }
// Returns employee details + today's clock state: 'notYetClockedIn' | 'clockedIn' | 'clockedOut'
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeNumber } = await req.json()
    if (!employeeNumber) {
      return NextResponse.json({ error: 'employeeNumber is required' }, { status: 400 })
    }

    const employee = await prisma.employees.findFirst({
      where: { employeeNumber, isActive: true },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        profilePhotoUrl: true,
        isClockInExempt: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        primaryBusinessId: true,
        userId: true,
        users: { select: { role: true } },
      },
    })

    if (!employee) {
      return NextResponse.json({ found: false }, { status: 200 })
    }

    // Get today's attendance record (date only, ignore time)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const attendance = await prisma.employeeAttendance.findFirst({
      where: {
        employeeId: employee.id,
        date: { gte: todayStart, lte: todayEnd },
      },
    })

    let clockState: 'notYetClockedIn' | 'clockedIn' | 'clockedOut' = 'notYetClockedIn'
    if (attendance?.checkIn && attendance?.checkOut) {
      clockState = 'clockedOut'
    } else if (attendance?.checkIn) {
      clockState = 'clockedIn'
    }

    // True when the scanned card belongs to the currently logged-in user
    const isOwnCard = !!(employee.userId && employee.userId === user.id)

    return NextResponse.json({
      found: true,
      isOwnCard,
      scannedUserRole: (employee as any).users?.role ?? null,
      employee,
      clockState,
      attendance: attendance
        ? {
            id: attendance.id,
            checkIn: attendance.checkIn,
            checkOut: attendance.checkOut,
            hoursWorked: attendance.hoursWorked,
          }
        : null,
    })
  } catch (error) {
    console.error('Clock-in scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
