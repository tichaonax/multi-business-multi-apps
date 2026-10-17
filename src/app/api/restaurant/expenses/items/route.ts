import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { checkRestaurantAccess, itemNameKey } from '@/lib/restaurant-expenses'

const ITEM_SELECT = {
  id: true,
  name: true,
  useCount: true,
  categoryId: true,
  subcategoryId: true,
  category: { select: { id: true, name: true, emoji: true, domain: { select: { id: true, name: true, emoji: true } } } },
  subcategory: { select: { id: true, name: true, emoji: true } },
} as const

/** GET /api/restaurant/expenses/items?businessId&q — MBM-319: the restaurant's
 * expense item catalogue, most-purchased first. */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const params = request.nextUrl.searchParams
    const businessId = params.get('businessId')
    const denied = await checkRestaurantAccess(user, businessId)
    if (denied) return denied

    const q = (params.get('q') || '').trim()
    const items = await prisma.restaurantExpenseItems.findMany({
      where: { businessId: businessId!, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: [{ useCount: 'desc' }, { lastUsedAt: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
      take: 50,
      select: ITEM_SELECT,
    })
    return NextResponse.json({ success: true, data: items })
  } catch (err) {
    console.error('[GET /api/restaurant/expenses/items]', err)
    return NextResponse.json({ error: 'Failed to load items' }, { status: 500 })
  }
}

/** POST /api/restaurant/expenses/items {businessId, name, categoryId?, subcategoryId?}
 * — add an item (or return the existing one with the same name). With no
 * classification it stays Unclassified until it is first paid. */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, categoryId, subcategoryId } = body
    const name = String(body.name || '').trim()
    const denied = await checkRestaurantAccess(user, businessId)
    if (denied) return denied
    if (!name) return NextResponse.json({ error: 'Item name is required' }, { status: 400 })
    if (name.length > 120) return NextResponse.json({ error: 'Item name is too long' }, { status: 400 })

    const nameKey = itemNameKey(name)
    const existing = await prisma.restaurantExpenseItems.findUnique({
      where: { businessId_nameKey: { businessId, nameKey } },
      select: ITEM_SELECT,
    })
    if (existing) return NextResponse.json({ success: true, data: existing, existed: true })

    try {
      const item = await prisma.restaurantExpenseItems.create({
        data: {
          businessId,
          name,
          nameKey,
          categoryId: categoryId || null,
          subcategoryId: categoryId && subcategoryId ? subcategoryId : null,
          createdBy: user.id,
        },
        select: ITEM_SELECT,
      })
      return NextResponse.json({ success: true, data: item }, { status: 201 })
    } catch (err: any) {
      // Same name added concurrently — return that one.
      if (err?.code === 'P2002') {
        const item = await prisma.restaurantExpenseItems.findUnique({
          where: { businessId_nameKey: { businessId, nameKey } },
          select: ITEM_SELECT,
        })
        return NextResponse.json({ success: true, data: item, existed: true })
      }
      throw err
    }
  } catch (err) {
    console.error('[POST /api/restaurant/expenses/items]', err)
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
  }
}
