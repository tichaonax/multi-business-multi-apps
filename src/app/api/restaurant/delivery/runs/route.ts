import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// POST — create a new delivery run
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, driverId, vehicleId, vehiclePlate, odometerStart, runDate, notes } = body

    const perms = getEffectivePermissions(user, businessId ?? undefined)
    if (!perms.canManageDeliveryRuns) {
      return NextResponse.json({ error: 'Forbidden: canManageDeliveryRuns required' }, { status: 403 })
    }

    if (!businessId || !driverId) {
      return NextResponse.json({ error: 'businessId and driverId are required' }, { status: 400 })
    }

    const run = await prisma.deliveryRuns.create({
      data: {
        businessId,
        driverId,
        vehicleId: vehicleId || null,
        vehiclePlate: vehiclePlate || null,
        odometerStart: odometerStart != null ? Number(odometerStart) : null,
        runDate: runDate ? new Date(runDate) : new Date(),
        notes: notes || null,
        createdBy: user.id,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, run })
  } catch (error) {
    console.error('Error creating delivery run:', error)
    return NextResponse.json({ error: 'Failed to create delivery run' }, { status: 500 })
  }
}

// GET — list delivery runs by date and business
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const date = searchParams.get('date') // YYYY-MM-DD
    const vehicleId = searchParams.get('vehicleId')

    const perms = getEffectivePermissions(user, businessId ?? undefined)
    if (!perms.canViewDeliveryQueue) {
      return NextResponse.json({ error: 'Forbidden: canViewDeliveryQueue required' }, { status: 403 })
    }

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    let dateFilter: { gte?: Date; lt?: Date } | undefined
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`)
      const end = new Date(`${date}T23:59:59.999Z`)
      dateFilter = { gte: start, lt: end }
    }

    const runs = await prisma.deliveryRuns.findMany({
      where: {
        businessId,
        ...(vehicleId ? { vehicleId } : {}),
        ...(dateFilter ? { runDate: dateFilter } : {}),
      },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true, fullName: true } },
        orders: { select: { id: true, orderId: true, status: true, paymentMode: true, creditUsed: true } },
      },
      orderBy: { runDate: 'desc' },
    })

    return NextResponse.json({ success: true, runs })
  } catch (error) {
    console.error('Error fetching delivery runs:', error)
    return NextResponse.json({ error: 'Failed to fetch delivery runs' }, { status: 500 })
  }
}
