import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// POST /api/clock-in/external/action
// Body (clockIn):  { action: 'clockIn',  type: 'contractor'|'visitor', businessId, personId?, visitorName? }
// Body (clockOut): { action: 'clockOut', recordId: string }
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, type, businessId, personId, visitorName, recordId } = body

    if (!action || !['clockIn', 'clockOut'].includes(action)) {
      return NextResponse.json({ error: 'action must be clockIn or clockOut' }, { status: 400 })
    }

    if (action === 'clockOut') {
      if (!recordId) {
        return NextResponse.json({ error: 'recordId is required for clockOut' }, { status: 400 })
      }
      const existing = await prisma.externalClockIn.findUnique({ where: { id: recordId } })
      if (!existing) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 })
      }
      if (existing.clockOut) {
        return NextResponse.json({ error: 'Already clocked out' }, { status: 409 })
      }

      const now = new Date()
      const hoursWorked = existing.clockIn
        ? Math.round(((now.getTime() - (existing.clockIn as Date).getTime()) / (1000 * 60 * 60)) * 100) / 100
        : null

      const record = await prisma.externalClockIn.update({
        where: { id: recordId },
        data: { clockOut: now, hoursWorked },
        include: { persons: { select: { id: true, fullName: true, phone: true, nationalId: true } } },
      })
      return NextResponse.json({ success: true, record })
    }

    // clockIn
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }
    const businessExists = await prisma.businesses.findUnique({ where: { id: businessId }, select: { id: true } })
    if (!businessExists) {
      return NextResponse.json({ error: 'Invalid businessId' }, { status: 400 })
    }
    if (!type || !['contractor', 'visitor'].includes(type)) {
      return NextResponse.json({ error: 'type must be contractor or visitor' }, { status: 400 })
    }
    if (type === 'contractor' && !personId) {
      return NextResponse.json({ error: 'personId is required for contractor clock-in' }, { status: 400 })
    }
    if (type === 'visitor' && !visitorName?.trim()) {
      return NextResponse.json({ error: 'visitorName is required for visitor clock-in' }, { status: 400 })
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Prevent duplicate clock-in for the same contractor today
    if (type === 'contractor' && personId) {
      const existing = await prisma.externalClockIn.findFirst({
        where: { personId, date: { gte: todayStart }, clockOut: null },
      })
      if (existing) {
        return NextResponse.json({ error: 'This contractor is already clocked in today' }, { status: 409 })
      }
    }

    const record = await prisma.externalClockIn.create({
      data: {
        type,
        personId: type === 'contractor' ? personId : null,
        visitorName: type === 'visitor' ? visitorName.trim() : null,
        businessId,
        date: todayStart,
        clockIn: new Date(),
        createdBy: user.id,
      },
      include: { persons: { select: { id: true, fullName: true, phone: true, nationalId: true } } },
    })

    return NextResponse.json({ success: true, record })
  } catch (error) {
    console.error('External clock-in action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
