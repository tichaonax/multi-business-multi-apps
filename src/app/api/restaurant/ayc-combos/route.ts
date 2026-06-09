import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const [combos, configs] = await Promise.all([
      prisma.asYouLikeItCombos.findMany({
        where: { businessId, isActive: true },
        include: {
          sizes: { orderBy: { sortOrder: 'asc' } },
          items: {
            where: { isActive: true, pool_item: { isActive: true } },
            orderBy: { sortOrder: 'asc' },
            include: {
              pool_item: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      (prisma as any).displayProductConfig.findMany({
        where: { businessId, itemType: 'ayli_combo' },
        select: { itemId: true, advertisingImageId: true },
      }),
    ])

    const adImageMap = new Map<string, string | null>()
    for (const c of configs) adImageMap.set(c.itemId, c.advertisingImageId ?? null)

    const result = combos.map((combo: any) => ({
      ...combo,
      adImageId: adImageMap.get(combo.id) ?? null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('AYC combos GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch combos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canCreateAYLICombos')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    // poolItems: [{poolItemId, pricePerKgSmall, pricePerKgMedium, pricePerKgLarge}]
    // poolItemIds: legacy simple array — prices default to 0
    const { businessId, name, description, sizes, poolItems, poolItemIds } = body
    const resolvedItems: Array<{ poolItemId: string; pricePerKgSmall: number; pricePerKgMedium: number; pricePerKgLarge: number }> =
      poolItems ?? (poolItemIds ?? []).map((id: string) => ({ poolItemId: id, pricePerKgSmall: 0, pricePerKgMedium: 0, pricePerKgLarge: 0 }))

    if (!businessId || !name) {
      return NextResponse.json({ error: 'businessId and name are required' }, { status: 400 })
    }
    if (!sizes || sizes.length === 0) {
      return NextResponse.json({ error: 'At least one size is required' }, { status: 400 })
    }
    if (resolvedItems.length === 0) {
      return NextResponse.json({ error: 'At least one allowed item is required' }, { status: 400 })
    }

    const combo = await prisma.asYouLikeItCombos.create({
      data: {
        businessId,
        name,
        description: description || null,
        sizes: {
          create: sizes.map((s: any, i: number) => ({
            sizeName: s.sizeName,
            basePrice: parseFloat(s.basePrice),
            meatThresholdKg: s.meatThresholdKg != null ? parseFloat(s.meatThresholdKg) : null,
            sortOrder: i
          }))
        },
        items: {
          create: resolvedItems.map((item: any, i: number) => ({
            poolItemId: item.poolItemId,
            pricePerKgSmall: parseFloat(item.pricePerKgSmall) || 0,
            pricePerKgMedium: parseFloat(item.pricePerKgMedium) || 0,
            pricePerKgLarge: parseFloat(item.pricePerKgLarge) || 0,
            sortOrder: i
          }))
        }
      },
      include: {
        sizes: { orderBy: { sortOrder: 'asc' } },
        items: { orderBy: { sortOrder: 'asc' }, include: { pool_item: true } }
      }
    })

    return NextResponse.json(combo, { status: 201 })
  } catch (error) {
    console.error('AYC combos POST error:', error)
    return NextResponse.json({ error: 'Failed to create combo' }, { status: 500 })
  }
}
