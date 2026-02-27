import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// PUT /api/clock-in/employees/[id]/schedule
// Body: { scheduledStartTime?: string, scheduledEndTime?: string }
// Updates the employee's scheduled work hours (HH:MM format)
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

    const { scheduledStartTime, scheduledEndTime } = await req.json()

    // Validate HH:MM format if provided
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (scheduledStartTime && !timeRegex.test(scheduledStartTime)) {
      return NextResponse.json({ error: 'scheduledStartTime must be in HH:MM format' }, { status: 400 })
    }
    if (scheduledEndTime && !timeRegex.test(scheduledEndTime)) {
      return NextResponse.json({ error: 'scheduledEndTime must be in HH:MM format' }, { status: 400 })
    }

    const employee = await prisma.employees.update({
      where: { id },
      data: {
        ...(scheduledStartTime !== undefined ? { scheduledStartTime } : {}),
        ...(scheduledEndTime !== undefined ? { scheduledEndTime } : {}),
      },
      select: {
        id: true,
        fullName: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
      },
    })

    return NextResponse.json({ success: true, employee })
  } catch (error) {
    console.error('Schedule update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
