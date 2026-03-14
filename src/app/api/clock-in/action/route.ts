import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// POST /api/clock-in/action
// Body: { employeeId: string, action: 'clockIn' | 'clockOut', photoUrl?: string, manualTime?: string }
// manualTime: ISO string — if provided, overrides current time (manager manual entry)
// For full manual entry (both in+out), use action='manualEntry' with manualCheckIn + manualCheckOut
// Body (manualEntry): { employeeId, action: 'manualEntry', manualCheckIn: string, manualCheckOut?: string }
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId, action, photoUrl, manualTime, manualCheckIn, manualCheckOut, date } = await req.json()
    if (!employeeId || !action) {
      return NextResponse.json({ error: 'employeeId and action are required' }, { status: 400 })
    }
    if (!['clockIn', 'clockOut', 'manualEntry'].includes(action)) {
      return NextResponse.json({ error: 'action must be clockIn, clockOut, or manualEntry' }, { status: 400 })
    }

    // Use provided date for manualEntry, otherwise default to today
    // Use T00:00:00 suffix to parse as local time (not UTC), matching how today API reads dates
    const baseDate = date ? new Date(date + 'T00:00:00') : new Date()
    const dayStart = new Date(baseDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(baseDate)
    dayEnd.setHours(23, 59, 59, 999)

    const existing = await prisma.employeeAttendance.findFirst({
      where: {
        employeeId,
        date: { gte: dayStart, lte: dayEnd },
      },
    })

    let attendance

    if (action === 'manualEntry') {
      // Manager manual entry — upsert today's record with provided times
      if (!manualCheckIn) {
        return NextResponse.json({ error: 'manualCheckIn is required for manual entry' }, { status: 400 })
      }
      const checkInTime = new Date(manualCheckIn)
      const checkOutTime = manualCheckOut ? new Date(manualCheckOut) : null
      const hoursWorked = checkOutTime
        ? Math.round(((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)) * 100) / 100
        : null

      const data: any = {
        checkIn: checkInTime,
        status: 'present',
        notes: 'Manual entry by manager',
        ...(checkOutTime ? { checkOut: checkOutTime, hoursWorked } : {}),
      }

      if (existing) {
        attendance = await prisma.employeeAttendance.update({ where: { id: existing.id }, data })
      } else {
        attendance = await prisma.employeeAttendance.create({
          data: { employeeId, date: dayStart, ...data },
        })
      }
      return NextResponse.json({ success: true, attendance })
    }

    const now = manualTime ? new Date(manualTime) : new Date()

    if (action === 'clockIn') {
      if (existing?.checkIn) {
        return NextResponse.json({ error: 'Employee is already clocked in today' }, { status: 409 })
      }
      if (existing) {
        attendance = await prisma.employeeAttendance.update({
          where: { id: existing.id },
          data: { checkIn: now, clockInPhotoUrl: photoUrl ?? null, status: 'present' },
        })
      } else {
        attendance = await prisma.employeeAttendance.create({
          data: {
            employeeId,
            date: dayStart,
            checkIn: now,
            clockInPhotoUrl: photoUrl ?? null,
            status: 'present',
          },
        })
      }
    } else {
      // clockOut
      if (!existing?.checkIn) {
        return NextResponse.json({ error: 'Employee has not clocked in today' }, { status: 409 })
      }
      if (existing.checkOut) {
        return NextResponse.json({ error: 'Employee has already clocked out today' }, { status: 409 })
      }

      const checkInTime = existing.checkIn as Date
      const hoursWorked = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

      attendance = await prisma.employeeAttendance.update({
        where: { id: existing.id },
        data: {
          checkOut: now,
          clockOutPhotoUrl: photoUrl ?? null,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
        },
      })
    }

    return NextResponse.json({ success: true, attendance })
  } catch (error) {
    console.error('Clock-in action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
