import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/clock-in/external/today?businessId=
// Returns today's external clock-in records (contractors + visitors)
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

    const records = await prisma.externalClockIn.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        ...(businessId ? { businessId } : {}),
      },
      include: {
        persons: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            nationalId: true,
          },
        },
      },
      orderBy: { clockIn: 'asc' },
    })

    const result = records.map((r: (typeof records)[number]) => ({
      id: r.id,
      type: r.type,
      personId: r.personId,
      visitorName: r.visitorName,
      person: r.persons ?? null,
      displayName: r.persons?.fullName ?? r.visitorName ?? 'Unknown',
      businessId: r.businessId,
      date: r.date,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
      hoursWorked: r.hoursWorked,
      notes: r.notes,
      clockState: r.clockOut ? 'clockedOut' : r.clockIn ? 'clockedIn' : 'notYetClockedIn',
    }))

    return NextResponse.json({ records: result })
  } catch (error) {
    console.error('External clock-in today error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
