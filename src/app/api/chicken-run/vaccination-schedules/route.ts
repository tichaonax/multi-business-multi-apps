import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const schedules = await prisma.chickenVaccinationSchedule.findMany({
      where: { businessId, isActive: true },
      orderBy: { dayAge: 'asc' },
    })

    return NextResponse.json({ success: true, data: schedules })
  } catch (error) {
    console.error('GET /api/chicken-run/vaccination-schedules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { businessId, name, dayAge, notes } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (dayAge === undefined || dayAge === null) return NextResponse.json({ error: 'dayAge is required' }, { status: 400 })

    const schedule = await prisma.chickenVaccinationSchedule.create({
      data: {
        businessId,
        name,
        dayAge: Number(dayAge),
        notes: notes || null,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, data: schedule })
  } catch (error) {
    console.error('POST /api/chicken-run/vaccination-schedules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
