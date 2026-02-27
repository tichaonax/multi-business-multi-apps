import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/clock-in/attendance/[id]/photo
// Public — called from the kiosk card-scan overlay to attach a clock-in photo.
// Body: { clockInPhotoUrl?: string, clockOutPhotoUrl?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { clockInPhotoUrl, clockOutPhotoUrl } = await req.json()

    const data: Record<string, string> = {}
    if (clockInPhotoUrl) data.clockInPhotoUrl = clockInPhotoUrl
    if (clockOutPhotoUrl) data.clockOutPhotoUrl = clockOutPhotoUrl

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No photo URL provided' }, { status: 400 })
    }

    await prisma.employeeAttendance.update({ where: { id }, data })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Attendance photo update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
