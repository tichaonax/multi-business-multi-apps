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

    const combos = await prisma.asYouLikeItCombos.findMany({
      where: { businessId, isActive: true },
      include: {
        sizes: { orderBy: { sortOrder: 'asc' } },
        items: {
          where: { isActive: true, pool_item: { isActive: true } },
          orderBy: { sortOrder: 'asc' },
          include: {
            pool_item: true   // includes name + all 3 price tiers
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(combos)
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
    const { businessId, name, description, sizes, poolItemIds } = body

    if (!businessId || !name) {
      return NextResponse.json({ error: 'businessId and name are required' }, { status: 400 })
    }
    if (!sizes || sizes.length === 0) {
      return NextResponse.json({ error: 'At least one size is required' }, { status: 400 })
    }
    if (!poolItemIds || poolItemIds.length === 0) {
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
            sortOrder: i
          }))
        },
        items: {
          create: poolItemIds.map((poolItemId: string, i: number) => ({
            poolItemId,
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
