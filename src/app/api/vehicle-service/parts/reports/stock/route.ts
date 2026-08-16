import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

const PART_DOMAIN_IDS = ['vsdom_parts', 'vsdom_workshop']

// GET /api/vehicle-service/parts/reports/stock?businessId=
// Point-in-time stock report: current levels, low/out-of-stock, and a
// damage/loss total for the last 30 days (a rolling window, not a full
// history dump — the movement history on each part's own detail page is
// the place for the full audit trail).
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    const parts = await prisma.businessProducts.findMany({
      where: {
        businessId,
        businessType: 'vehicle_service',
        isActive: true,
        business_categories: { domainId: { in: PART_DOMAIN_IDS } },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        business_categories: { select: { name: true, emoji: true, domainId: true } },
        business_locations: { select: { name: true, locationCode: true } },
        product_variants: { select: { stockQuantity: true, reorderLevel: true } },
      },
    })

    const rows = parts.map(p => {
      const v = p.product_variants[0]
      const qty = Number(v?.stockQuantity ?? 0)
      const reorder = Number(v?.reorderLevel ?? 0)
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.business_categories?.name ?? null,
        domainId: p.business_categories?.domainId ?? null,
        location: p.business_locations ? `${p.business_locations.name} (${p.business_locations.locationCode})` : null,
        stockQuantity: qty,
        reorderLevel: reorder,
        status: qty <= 0 ? 'out_of_stock' : reorder > 0 && qty <= reorder ? 'low_stock' : 'in_stock',
      }
    })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const writeOffs = await prisma.businessStockMovements.groupBy({
      by: ['movementType'],
      where: { businessId, businessType: 'vehicle_service', movementType: { in: ['DAMAGE', 'THEFT'] }, createdAt: { gte: thirtyDaysAgo } },
      _sum: { quantity: true },
    })

    const byLocation: Record<string, number> = {}
    for (const r of rows) {
      const key = r.location || 'Unassigned'
      byLocation[key] = (byLocation[key] || 0) + r.stockQuantity
    }

    return NextResponse.json({
      success: true,
      parts: rows,
      summary: {
        totalParts: rows.length,
        inStock: rows.filter(r => r.status === 'in_stock').length,
        lowStock: rows.filter(r => r.status === 'low_stock').length,
        outOfStock: rows.filter(r => r.status === 'out_of_stock').length,
        writeOffsLast30Days: writeOffs.reduce((s, w) => s + Math.abs(Number(w._sum.quantity ?? 0)), 0),
        stockByLocation: byLocation,
      },
    })
  } catch (error) {
    console.error('Vehicle service parts stock report error:', error)
    return NextResponse.json({ error: 'Failed to build stock report' }, { status: 500 })
  }
}
