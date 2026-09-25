import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/warehouse/items/search?q=
 *
 * MBM-300 — search Warehouse items by tracking # or order # (plus product
 * name as a convenience), across every batch. The existing /warehouse list
 * only searches batch name/filename; this fills the item-level gap the
 * Container Batch import's reconciliation makes worth surfacing (e.g.
 * "where did tracking 79004158263592 end up?").
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const q = req.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 3) return NextResponse.json({ items: [] })

    const items = await (prisma as any).warehouseItems.findMany({
      where: {
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { trackingNumber: { contains: q, mode: 'insensitive' } },
          { productName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, batchId: true, orderNumber: true, trackingNumber: true, productName: true, shortName: true,
        status: true, manifestQty: true, landedCost: true, estSellingPrice: true, sourceBatchName: true, imageId: true,
        warehouse_batches: { select: { batchName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      items: items.map((i: any) => ({
        id: i.id,
        batchId: i.batchId,
        batchName: i.warehouse_batches?.batchName ?? null,
        orderNumber: i.orderNumber,
        trackingNumber: i.trackingNumber,
        productName: i.shortName || i.productName,
        status: i.status,
        manifestQty: i.manifestQty,
        landedCost: i.landedCost != null ? Number(i.landedCost) : null,
        estSellingPrice: i.estSellingPrice != null ? Number(i.estSellingPrice) : null,
        sourceBatchName: i.sourceBatchName,
        imageId: i.imageId,
      })),
    })
  } catch (error: any) {
    console.error('GET /api/warehouse/items/search error:', error)
    return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 })
  }
}
