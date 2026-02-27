import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// PUT /api/clock-in/attendance/[id]/approve
// Body: { adjustedClockOut?: string (ISO date string) }
// Manager approves or adjusts an auto clock-out
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { adjustedClockOut } = await req.json()

    const existing = await prisma.employeeAttendance.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      isApproved: true,
      autoClockOutApprovedBy: user.id,
      autoClockOutApprovedAt: new Date(),
    }

    if (adjustedClockOut) {
      const clockOut = new Date(adjustedClockOut)
      updateData.checkOut = clockOut
      // Recalculate hours worked
      if (existing.checkIn) {
        const hoursWorked = (clockOut.getTime() - (existing.checkIn as Date).getTime()) / (1000 * 60 * 60)
        updateData.hoursWorked = Math.round(hoursWorked * 100) / 100
      }
    }

    const attendance = await prisma.employeeAttendance.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, attendance })
  } catch (error) {
    console.error('Clock-in approve error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
