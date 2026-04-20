import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/restaurant/reports/prep-inventory?businessId=...&startDate=...&endDate=...
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30))
  const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : new Date()

  // Fetch all batches in date range for this business
  const batches = await prisma.menuItemInventoryBatch.findMany({
    where: {
      businessId,
      batchDate: { gte: start, lte: end },
    },
    include: {
      business_product: { select: { id: true, name: true, basePrice: true, attributes: true } },
    },
    orderBy: { batchDate: 'asc' },
  })

  // Group by product
  const productMap = new Map<string, {
    productId: string
    name: string
    price: number
    category: string
    unitsInitialized: number
    totalCost: number
    batchIds: string[]
  }>()

  for (const batch of batches) {
    const existing = productMap.get(batch.businessProductId)
    const price = Number(batch.business_product.basePrice)
    if (existing) {
      existing.unitsInitialized += batch.quantity
      existing.totalCost += Number(batch.totalCost)
      existing.batchIds.push(batch.id)
    } else {
      productMap.set(batch.businessProductId, {
        productId: batch.businessProductId,
        name: batch.business_product.name,
        price,
        category: (batch.business_product.attributes as any)?.category || '',
        unitsInitialized: batch.quantity,
        totalCost: Number(batch.totalCost),
        batchIds: [batch.id],
      })
    }
  }

  if (productMap.size === 0) {
    return NextResponse.json({ success: true, data: [], summary: { totalUnitsInitialized: 0, totalUnitsSold: 0, totalRevenue: 0, totalCost: 0, netProfit: 0 } })
  }

  // For each product, calculate units sold = unitsInitialized - current remaining in those batches
  const batchIds = batches.map(b => b.id)
  const currentBatches = await prisma.menuItemInventoryBatch.findMany({
    where: { id: { in: batchIds } },
    select: { id: true, businessProductId: true, remaining: true, quantity: true },
  })

  // Sum remaining per product for the selected batches
  const remainingByProduct = new Map<string, number>()
  for (const b of currentBatches) {
    remainingByProduct.set(b.businessProductId, (remainingByProduct.get(b.businessProductId) ?? 0) + b.remaining)
  }

  const rows = Array.from(productMap.values()).map(p => {
    const currentRemaining = remainingByProduct.get(p.productId) ?? 0
    const unitsSold = Math.max(0, p.unitsInitialized - currentRemaining)
    const revenue = unitsSold * p.price
    const profit = revenue - p.totalCost
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0
    return {
      productId: p.productId,
      name: p.name,
      category: p.category,
      price: p.price,
      unitsInitialized: p.unitsInitialized,
      unitsSold,
      revenue: Math.round(revenue * 100) / 100,
      totalCost: Math.round(p.totalCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 10) / 10,
    }
  })

  const summary = {
    totalUnitsInitialized: rows.reduce((s, r) => s + r.unitsInitialized, 0),
    totalUnitsSold: rows.reduce((s, r) => s + r.unitsSold, 0),
    totalRevenue: Math.round(rows.reduce((s, r) => s + r.revenue, 0) * 100) / 100,
    totalCost: Math.round(rows.reduce((s, r) => s + r.totalCost, 0) * 100) / 100,
    netProfit: Math.round(rows.reduce((s, r) => s + r.profit, 0) * 100) / 100,
  }

  return NextResponse.json({ success: true, data: rows, summary })
}
