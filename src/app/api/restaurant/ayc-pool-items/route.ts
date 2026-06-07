import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    // Return all items including disabled — back-office needs to see and re-enable them
    const items = await prisma.asYouLikeItPoolItems.findMany({
      where: { businessId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('AYC pool items GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch pool items' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, name, emoji, pricePerKgSmall, pricePerKgMedium, pricePerKgLarge } = await req.json()

    if (!businessId || !name) {
      return NextResponse.json({ error: 'businessId and name are required' }, { status: 400 })
    }

    const item = await prisma.asYouLikeItPoolItems.create({
      data: {
        businessId,
        name: name.trim(),
        emoji: emoji?.trim() || '🍽️',
        pricePerKgSmall: parseFloat(pricePerKgSmall) || 0,
        pricePerKgMedium: parseFloat(pricePerKgMedium) || 0,
        pricePerKgLarge: parseFloat(pricePerKgLarge) || 0,
      }
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('AYC pool items POST error:', error)
    return NextResponse.json({ error: 'Failed to create pool item' }, { status: 500 })
  }
}
