import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/restaurant/inventory-config?businessId=...
// Returns all business products with their tracking config
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const products = await prisma.businessProducts.findMany({
    where: { businessId, isActive: true, businessType: 'restaurant' },
    select: {
      id: true,
      name: true,
      basePrice: true,
      attributes: true,
      menu_item_inventory_configs: {
        where: { businessId },
        select: { id: true, isTracked: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const result = products.map(p => ({
    id: p.id,
    name: p.name,
    price: Number(p.basePrice),
    category: (p.attributes as any)?.category || '',
    isTracked: p.menu_item_inventory_configs[0]?.isTracked ?? false,
    configId: p.menu_item_inventory_configs[0]?.id ?? null,
  }))

  return NextResponse.json({ success: true, data: result })
}

// POST /api/restaurant/inventory-config
// Toggle tracking on a product: { businessProductId, businessId, isTracked }
export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessProductId, businessId, isTracked } = await req.json()
  if (!businessProductId || !businessId || typeof isTracked !== 'boolean') {
    return NextResponse.json({ error: 'businessProductId, businessId and isTracked required' }, { status: 400 })
  }

  const config = await prisma.menuItemInventoryConfig.upsert({
    where: { businessProductId_businessId: { businessProductId, businessId } },
    create: { businessProductId, businessId, isTracked },
    update: { isTracked },
  })

  return NextResponse.json({ success: true, data: config })
}
