import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

const DEFAULTS = { lowInventoryThreshold: 10, highMortalityThreshold: 5 }

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const settings = await prisma.chickenRunSettings.findUnique({ where: { businessId } })

    return NextResponse.json({
      success: true,
      data: settings ?? { ...DEFAULTS, businessId },
    })
  } catch (error) {
    console.error('GET /api/chicken-run/settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { businessId, lowInventoryThreshold, highMortalityThreshold } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const settings = await prisma.chickenRunSettings.upsert({
      where: { businessId },
      update: {
        lowInventoryThreshold: parseInt(lowInventoryThreshold ?? DEFAULTS.lowInventoryThreshold),
        highMortalityThreshold: parseFloat(highMortalityThreshold ?? DEFAULTS.highMortalityThreshold),
      },
      create: {
        businessId,
        lowInventoryThreshold: parseInt(lowInventoryThreshold ?? DEFAULTS.lowInventoryThreshold),
        highMortalityThreshold: parseFloat(highMortalityThreshold ?? DEFAULTS.highMortalityThreshold),
      },
    })

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('PUT /api/chicken-run/settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
