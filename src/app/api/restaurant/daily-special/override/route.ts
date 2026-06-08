import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

function getTodayDateStr(): string {
  return new Date().toLocaleDateString('en-CA')
}

// POST — disable today's special or swap to a different one
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canOverrideDailySpecial')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { businessId, isDisabled, overrideSpecialId } = await req.json()
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const date = getTodayDateStr()

    const override = await prisma.dailySpecialDayOverride.upsert({
      where: { businessId_date: { businessId, date } },
      create: {
        businessId,
        date,
        isDisabled: isDisabled ?? false,
        overrideSpecialId: overrideSpecialId ?? null,
        createdById: user.id,
        createdByName: user.name ?? '',
      },
      update: {
        isDisabled: isDisabled ?? false,
        overrideSpecialId: overrideSpecialId ?? null,
        createdById: user.id,
        createdByName: user.name ?? '',
      },
    })

    return NextResponse.json(override)
  } catch (error) {
    console.error('Daily special override POST error:', error)
    return NextResponse.json({ error: 'Failed to save override' }, { status: 500 })
  }
}

// DELETE — revert to scheduled special (remove override)
export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canOverrideDailySpecial')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const businessId = new URL(req.url).searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const date = getTodayDateStr()

    await prisma.dailySpecialDayOverride.deleteMany({
      where: { businessId, date },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Daily special override DELETE error:', error)
    return NextResponse.json({ error: 'Failed to revert override' }, { status: 500 })
  }
}
