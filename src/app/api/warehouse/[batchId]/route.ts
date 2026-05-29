import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { batchId } = await params
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const skip = (page - 1) * limit
    const search = searchParams.get('search')?.trim() || ''
    const statusFilter = searchParams.get('status') || ''

    const batch = await (prisma as any).warehouseBatches.findUnique({ where: { id: batchId } })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    const where: any = { batchId }
    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'PERSONAL') {
        where.isPersonal = true
      } else {
        where.status = statusFilter
      }
    }
    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { shortName: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [prismaItems, totalItems] = await Promise.all([
      (prisma as any).warehouseItems.findMany({
        where,
        orderBy: [{ rowNumber: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),
      (prisma as any).warehouseItems.count({ where }),
    ])

    // Enrich with new columns not in generated Prisma client + orderedQty from warehouse_order_refs
    const itemIds: string[] = prismaItems.map((i: any) => i.id)
    let itemExtras: Record<string, {
      originalQty: number | null
      originalPriceYuan: number | null
      qtyChangeReason: string | null
      manifestQty: number | null
      orderedQty: number | null
    }> = {}
    if (itemIds.length > 0) {
      const extras: any[] = await prisma.$queryRaw`
        SELECT
          wi.id,
          wi."originalQty",
          wi."originalPriceYuan",
          wi."qtyChangeReason",
          wi."manifestQty",
          wor."orderedQty"
        FROM warehouse_items wi
        LEFT JOIN warehouse_order_refs wor
          ON wor."orderNumber" = wi."orderNumber"
         AND wor."trackingNumber" = COALESCE(wi."trackingNumber", '')
        WHERE wi.id = ANY(${itemIds}::text[])
      `
      for (const e of extras) {
        itemExtras[e.id] = {
          originalQty: e.originalQty != null ? Number(e.originalQty) : null,
          originalPriceYuan: e.originalPriceYuan != null ? Number(e.originalPriceYuan) : null,
          qtyChangeReason: e.qtyChangeReason ?? null,
          manifestQty: e.manifestQty != null ? Number(e.manifestQty) : null,
          orderedQty: e.orderedQty != null ? Number(e.orderedQty) : null,
        }
      }
    }
    const items = prismaItems.map((i: any) => ({
      ...i,
      ...(itemExtras[i.id] ?? { originalQty: null, originalPriceYuan: null, qtyChangeReason: null, manifestQty: null, orderedQty: null }),
    }))

    // Status counts for filter tabs (always count from the full batch)
    const [statusCounts, personalCount, movedCostAgg] = await Promise.all([
      (prisma as any).warehouseItems.groupBy({
        by: ['status'],
        where: { batchId },
        _count: { id: true },
      }),
      (prisma as any).warehouseItems.count({ where: { batchId, isPersonal: true } }),
      (prisma as any).warehouseItems.aggregate({
        where: { batchId, status: 'MOVED_TO_BUSINESS' },
        _sum: { costUsd: true },
      }),
    ])
    const countsMap: Record<string, number> = { PERSONAL: personalCount }
    for (const s of statusCounts) countsMap[s.status] = s._count.id
    const movedToBusinessUsdCost = movedCostAgg._sum.costUsd != null ? Number(movedCostAgg._sum.costUsd) : null

    // Transport cost per item (eligible = IN_WAREHOUSE only)
    const inWarehouseCount = countsMap['IN_WAREHOUSE'] || 0
    const perItemTransport = (batch.pickedUpFromHarare && batch.transportCostHarare && inWarehouseCount > 0)
      ? Number(batch.transportCostHarare) / inWarehouseCount
      : 0

    // Duplicate detection: find order numbers / tracking numbers in THIS batch
    // that also appear in OTHER batches (informational only)
    const batchItems = await (prisma as any).warehouseItems.findMany({
      where: { batchId },
      select: { orderNumber: true, trackingNumber: true },
    })
    const batchOrderNums = batchItems.map((i: any) => i.orderNumber).filter(Boolean)
    const batchTrackNums = batchItems.map((i: any) => i.trackingNumber).filter(Boolean)

    const [dupOrders, dupTracking] = await Promise.all([
      batchOrderNums.length > 0
        ? (prisma as any).warehouseItems.findMany({
            where: { batchId: { not: batchId }, orderNumber: { in: batchOrderNums } },
            select: { orderNumber: true },
            distinct: ['orderNumber'],
          })
        : [],
      batchTrackNums.length > 0
        ? (prisma as any).warehouseItems.findMany({
            where: { batchId: { not: batchId }, trackingNumber: { in: batchTrackNums } },
            select: { trackingNumber: true },
            distinct: ['trackingNumber'],
          })
        : [],
    ])
    const duplicateOrderNumbers: string[] = dupOrders.map((i: any) => i.orderNumber)
    const duplicateTrackingNumbers: string[] = dupTracking.map((i: any) => i.trackingNumber)

    // Lock status for each order/tracking number in this batch
    const [orderLockRows, trackingLockRows] = await Promise.all([
      batchOrderNums.length > 0
        ? (prisma.$queryRaw`
            SELECT "referenceValue", "isLocked", "autoLocked", "importedQty", "originalQty"
            FROM warehouse_reference_locks
            WHERE "referenceType" = 'ORDER' AND "referenceValue" = ANY(${batchOrderNums}::text[])
          ` as Promise<any[]>)
        : Promise.resolve([]),
      batchTrackNums.length > 0
        ? (prisma.$queryRaw`
            SELECT "referenceValue", "isLocked", "autoLocked", "importedQty", "originalQty"
            FROM warehouse_reference_locks
            WHERE "referenceType" = 'TRACKING' AND "referenceValue" = ANY(${batchTrackNums}::text[])
          ` as Promise<any[]>)
        : Promise.resolve([]),
    ])
    const orderLockMap: Record<string, { isLocked: boolean; autoLocked: boolean; importedQty: number; originalQty: number | null }> = {}
    for (const r of orderLockRows) {
      orderLockMap[r.referenceValue] = { isLocked: r.isLocked, autoLocked: r.autoLocked, importedQty: Number(r.importedQty), originalQty: r.originalQty != null ? Number(r.originalQty) : null }
    }
    const trackingLockMap: Record<string, { isLocked: boolean; autoLocked: boolean; importedQty: number; originalQty: number | null }> = {}
    for (const r of trackingLockRows) {
      trackingLockMap[r.referenceValue] = { isLocked: r.isLocked, autoLocked: r.autoLocked, importedQty: Number(r.importedQty), originalQty: r.originalQty != null ? Number(r.originalQty) : null }
    }

    return NextResponse.json({
      batch: {
        id: batch.id,
        batchName: batch.batchName,
        batchNumber: batch.batchNumber,
        importedAt: batch.importedAt,
        status: batch.status,
        rowCount: batch.rowCount,
        totalYuanCost: batch.totalYuanCost,
        totalUsdCost: batch.totalUsdCost,
        collectionFee: batch.collectionFee,
        pickedUpFromHarare: batch.pickedUpFromHarare,
        transportCostHarare: batch.transportCostHarare,
        transactionFeePct: batch.transactionFeePct != null ? Number(batch.transactionFeePct) : null,
        perItemTransport,
        notes: batch.notes,
        originalFileName: batch.originalFileName,
      },
      items,
      statusCounts: countsMap,
      movedToBusinessUsdCost,
      duplicateOrderNumbers,
      duplicateTrackingNumbers,
      orderLockMap,
      trackingLockMap,
      pagination: { page, limit, total: totalItems, pages: Math.ceil(totalItems / limit) },
    })
  } catch (error: any) {
    console.error('GET /api/warehouse/[batchId] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { batchId } = await params
    const body = await req.json()

    const batch = await (prisma as any).warehouseBatches.findUnique({ where: { id: batchId } })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    const allowedFields = ['pickedUpFromHarare', 'transportCostHarare', 'notes', 'batchName']
    const updateData: any = {}
    for (const field of allowedFields) {
      if (field in body) updateData[field] = body[field]
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await (prisma as any).warehouseBatches.update({
      where: { id: batchId },
      data: { ...updateData, updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, batch: updated })
  } catch (error: any) {
    console.error('PATCH /api/warehouse/[batchId] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { batchId } = await params

    const batch = await (prisma as any).warehouseBatches.findUnique({ where: { id: batchId } })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    if (batch.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Only ACTIVE batches can be deleted' }, { status: 400 })
    }

    // Guard: no items moved
    const movedCount = await (prisma as any).warehouseItems.count({
      where: { batchId, status: { in: ['MOVED_TO_BUSINESS', 'MOVED_TO_PERSONAL'] } }
    })
    if (movedCount > 0) {
      return NextResponse.json({
        error: `Cannot delete batch — ${movedCount} item(s) have already been moved. Reverse those moves first.`
      }, { status: 400 })
    }

    // Collect imageIds referenced by this batch's items before deleting
    const itemsWithImages = await (prisma as any).warehouseItems.findMany({
      where: { batchId, imageId: { not: null } },
      select: { imageId: true },
    })
    const imageIds = itemsWithImages.map((i: any) => i.imageId).filter(Boolean)

    // Delete items (cascade would also work but being explicit)
    await (prisma as any).warehouseItems.deleteMany({ where: { batchId } })
    await (prisma as any).warehouseBatches.delete({ where: { id: batchId } })

    // Delete orphaned images (not referenced by any other warehouse_items or product_images)
    if (imageIds.length > 0) {
      const stillUsedInWarehouse = await (prisma as any).warehouseItems.findMany({
        where: { imageId: { in: imageIds } },
        select: { imageId: true },
      })
      const stillUsedInProducts = await (prisma as any).productImages.findMany({
        where: { imageId: { in: imageIds } },
        select: { imageId: true },
      })
      const usedSet = new Set([
        ...stillUsedInWarehouse.map((r: any) => r.imageId),
        ...stillUsedInProducts.map((r: any) => r.imageId),
      ])
      const orphanIds = imageIds.filter((id: string) => !usedSet.has(id))
      if (orphanIds.length > 0) {
        await (prisma as any).images.deleteMany({ where: { id: { in: orphanIds } } })
      }
    }

    return NextResponse.json({ success: true, message: 'Batch deleted' })
  } catch (error: any) {
    console.error('DELETE /api/warehouse/[batchId] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
