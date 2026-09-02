import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

const DAY_FIELDS = ['tradesMonday', 'tradesTuesday', 'tradesWednesday', 'tradesThursday', 'tradesFriday', 'tradesSaturday', 'tradesSunday'] as const

/**
 * GET/PUT /api/business-targets/[businessId]/schedule — MBM-288 §2.5.
 * No row = every day trades (the default before an admin has configured
 * anything), matching current system-wide behavior.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const schedule = await prisma.businessTradingSchedule.findUnique({ where: { businessId } })
    if (!schedule) {
      return NextResponse.json({
        success: true,
        data: { businessId, tradesMonday: true, tradesTuesday: true, tradesWednesday: true, tradesThursday: true, tradesFriday: true, tradesSaturday: true, tradesSunday: false, isDefault: true },
      })
    }
    return NextResponse.json({ success: true, data: { ...schedule, isDefault: false } })
  } catch (error) {
    console.error('Error fetching trading schedule:', error)
    return NextResponse.json({ error: 'Failed to fetch trading schedule' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { id: true } })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const payload = await request.json()
    const data: any = { updatedBy: user.id }
    for (const field of DAY_FIELDS) {
      if (payload.hasOwnProperty(field)) data[field] = !!payload[field]
    }

    const schedule = await prisma.businessTradingSchedule.upsert({
      where: { businessId },
      create: { businessId, ...data },
      update: data,
    })

    return NextResponse.json({ success: true, data: schedule })
  } catch (error) {
    console.error('Error updating trading schedule:', error)
    return NextResponse.json({ error: 'Failed to update trading schedule' }, { status: 500 })
  }
}
