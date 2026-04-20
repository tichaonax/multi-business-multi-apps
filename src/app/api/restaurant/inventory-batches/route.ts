import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/restaurant/inventory-batches?businessId=...
// Returns tracked products with their total remaining count and carry-over details
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  // Get all actively tracked products
  const configs = await prisma.menuItemInventoryConfig.findMany({
    where: { businessId, isTracked: true },
    include: {
      business_product: {
        select: { id: true, name: true, basePrice: true, attributes: true },
      },
    },
    orderBy: { business_product: { name: 'asc' } },
  })

  // For each tracked product, sum remaining across all batches with remaining > 0
  const results = await Promise.all(
    configs.map(async config => {
      const batches = await prisma.menuItemInventoryBatch.findMany({
        where: { businessProductId: config.businessProductId, businessId, remaining: { gt: 0 } },
        orderBy: { batchDate: 'asc' },
        select: { id: true, quantity: true, remaining: true, costPerUnit: true, totalCost: true, batchDate: true },
      })
      const totalRemaining = batches.reduce((sum, b) => sum + b.remaining, 0)
      return {
        businessProductId: config.businessProductId,
        name: config.business_product.name,
        price: Number(config.business_product.basePrice),
        category: (config.business_product.attributes as any)?.category || '',
        totalRemaining,
        batches,
      }
    })
  )

  return NextResponse.json({ success: true, data: results })
}

// POST /api/restaurant/inventory-batches
// Initialize a new batch: { businessProductId, businessId, quantity, costPerUnit }
export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessProductId, businessId, quantity, costPerUnit } = await req.json()

  if (!businessProductId || !businessId || !quantity || costPerUnit === undefined) {
    return NextResponse.json({ error: 'businessProductId, businessId, quantity and costPerUnit required' }, { status: 400 })
  }

  const qty = Number(quantity)
  const cost = Number(costPerUnit)

  if (qty < 1) return NextResponse.json({ error: 'quantity must be at least 1' }, { status: 400 })
  if (cost < 0) return NextResponse.json({ error: 'costPerUnit cannot be negative' }, { status: 400 })

  const batch = await prisma.menuItemInventoryBatch.create({
    data: {
      businessProductId,
      businessId,
      quantity: qty,
      remaining: qty,
      costPerUnit: cost,
      totalCost: qty * cost,
      createdBy: user.id,
    },
  })

  return NextResponse.json({ success: true, data: batch })
}
