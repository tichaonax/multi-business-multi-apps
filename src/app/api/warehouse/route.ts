import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const [batches, total] = await Promise.all([
      (prisma as any).warehouseBatches.findMany({
        orderBy: { importedAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { warehouse_items: true }
          }
        }
      }),
      (prisma as any).warehouseBatches.count(),
    ])

    // Get moved counts per batch in one query
    const batchIds = batches.map((b: any) => b.id)
    const movedCounts = batchIds.length > 0
      ? await (prisma as any).warehouseItems.groupBy({
          by: ['batchId', 'status'],
          where: { batchId: { in: batchIds }, status: { in: ['MOVED_TO_BUSINESS', 'MOVED_TO_PERSONAL'] } },
          _count: { id: true },
        })
      : []

    const movedByBatch: Record<string, number> = {}
    for (const row of movedCounts) {
      movedByBatch[row.batchId] = (movedByBatch[row.batchId] || 0) + row._count.id
    }

    const result = batches.map((b: any) => ({
      id: b.id,
      batchName: b.batchName,
      batchNumber: b.batchNumber,
      importedAt: b.importedAt,
      status: b.status,
      rowCount: b.rowCount,
      itemCount: b._count.warehouse_items,
      movedCount: movedByBatch[b.id] || 0,
      totalYuanCost: b.totalYuanCost,
      totalUsdCost: b.totalUsdCost,
      collectionFee: b.collectionFee,
      pickedUpAtCollectionPoint: b.pickedUpAtCollectionPoint,
      collectionTransportCost: b.collectionTransportCost,
      notes: b.notes,
      originalFileName: b.originalFileName,
    }))

    // Summary stats
    const stats = await (prisma as any).warehouseItems.groupBy({
      by: ['status'],
      _count: { id: true },
    })
    const statMap: Record<string, number> = {}
    for (const s of stats) statMap[s.status] = s._count.id

    // Potential selling value of everything moved into a business — quantity
    // actually moved × that product's CURRENT listed price (not the estimate
    // from move time, since the price may have been edited since). Computed
    // per batch (each row depends only on ITS OWN moved inventory) as well as
    // the grand total for the summary card.
    const movedItems = await (prisma as any).warehouseItems.findMany({
      where: { status: 'MOVED_TO_BUSINESS', businessProductId: { not: null } },
      select: { batchId: true, businessProductId: true, manifestQty: true, quantity: true },
    })
    const movedProductIds = [...new Set(movedItems.map((i: any) => i.businessProductId))] as string[]
    const movedProducts = movedProductIds.length > 0
      ? await (prisma as any).businessProducts.findMany({
          where: { id: { in: movedProductIds } },
          select: { id: true, basePrice: true },
        })
      : []
    const priceByProductId = new Map(movedProducts.map((p: any) => [p.id, Number(p.basePrice) || 0]))
    const potentialValueByBatch: Record<string, number> = {}
    let movedToBusinessPotentialValue = 0
    for (const i of movedItems) {
      const price = (priceByProductId.get(i.businessProductId) as number) ?? 0
      const qty = i.manifestQty ?? i.quantity ?? 1
      const value = price * qty
      potentialValueByBatch[i.batchId] = (potentialValueByBatch[i.batchId] || 0) + value
      movedToBusinessPotentialValue += value
    }

    return NextResponse.json({
      batches: result.map((b: any) => ({ ...b, movedPotentialValue: potentialValueByBatch[b.id] || 0 })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats: {
        totalBatches: total,
        inWarehouse: statMap['IN_WAREHOUSE'] || 0,
        movedToBusiness: statMap['MOVED_TO_BUSINESS'] || 0,
        movedToPersonal: statMap['MOVED_TO_PERSONAL'] || 0,
        movedToBusinessPotentialValue,
      },
    })
  } catch (error: any) {
    console.error('GET /api/warehouse error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
