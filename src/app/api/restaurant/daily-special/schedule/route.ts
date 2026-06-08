import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

// GET — return full 7-day schedule for the business
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canManageDailySpecial')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const businessId = new URL(req.url).searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const schedule = await prisma.dailySpecialSchedule.findMany({
      where: { businessId },
      include: {
        daily_special: {
          select: {
            id: true,
            specialPrice: true,
            product: { select: { name: true, basePrice: true } },
          },
        },
      },
    })

    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Daily special schedule GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}

// PUT — assign or clear a special for a day of the week
export async function PUT(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canManageDailySpecial')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { businessId, dayOfWeek, specialId } = await req.json()

    if (!businessId || dayOfWeek == null) {
      return NextResponse.json({ error: 'businessId and dayOfWeek required' }, { status: 400 })
    }

    if (specialId == null) {
      // Clear the day's schedule
      await prisma.dailySpecialSchedule.deleteMany({
        where: { businessId, dayOfWeek },
      })
      return NextResponse.json({ success: true })
    }

    // Upsert the schedule slot
    const slot = await prisma.dailySpecialSchedule.upsert({
      where: { businessId_dayOfWeek: { businessId, dayOfWeek } },
      create: { businessId, dayOfWeek, specialId },
      update: { specialId },
    })

    return NextResponse.json(slot)
  } catch (error) {
    console.error('Daily special schedule PUT error:', error)
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}
