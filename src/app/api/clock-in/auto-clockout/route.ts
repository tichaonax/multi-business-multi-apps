import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// POST /api/clock-in/auto-clockout
// Finds all employees who are clocked in, have a scheduledEndTime set,
// and whose scheduled end time has passed today. Clocks them out automatically.
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Find all active attendance records where employee is still clocked in
    const openAttendance = await prisma.employeeAttendance.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        checkIn: { not: null },
        checkOut: null,
      },
      include: {
        employees: {
          select: {
            id: true,
            fullName: true,
            scheduledEndTime: true,
            isClockInExempt: true,
          },
        },
      },
    })

    const autoClocked: string[] = []

    for (const record of openAttendance) {
      const emp = record.employees
      if (!emp.scheduledEndTime || emp.isClockInExempt) continue

      // Parse scheduled end time as today's date + HH:MM
      const [endH, endM] = emp.scheduledEndTime.split(':').map(Number)
      const scheduledEnd = new Date()
      scheduledEnd.setHours(endH, endM, 0, 0)

      // Only auto clock-out if scheduled end time has passed
      if (now <= scheduledEnd) continue

      const checkInTime = record.checkIn as Date
      const hoursWorked = (scheduledEnd.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

      await prisma.employeeAttendance.update({
        where: { id: record.id },
        data: {
          checkOut: scheduledEnd,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          isAutoClockOut: true,
          isApproved: false,
        },
      })

      autoClocked.push(emp.fullName)
    }

    return NextResponse.json({ success: true, count: autoClocked.length, employees: autoClocked })
  } catch (error) {
    console.error('Auto clock-out error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
