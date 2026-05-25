import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { batchId } = params
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

    const [items, totalItems] = await Promise.all([
      (prisma as any).warehouseItems.findMany({
        where,
        orderBy: [{ rowNumber: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),
      (prisma as any).warehouseItems.count({ where }),
    ])

    // Status counts for filter tabs (always count from the full batch)
    const statusCounts = await (prisma as any).warehouseItems.groupBy({
      by: ['status'],
      where: { batchId },
      _count: { id: true },
    })
    const personalCount = await (prisma as any).warehouseItems.count({ where: { batchId, isPersonal: true } })
    const countsMap: Record<string, number> = { PERSONAL: personalCount }
    for (const s of statusCounts) countsMap[s.status] = s._count.id

    // Transport cost per item (eligible = IN_WAREHOUSE only)
    const inWarehouseCount = countsMap['IN_WAREHOUSE'] || 0
    const perItemTransport = (batch.pickedUpFromHarare && batch.transportCostHarare && inWarehouseCount > 0)
      ? Number(batch.transportCostHarare) / inWarehouseCount
      : 0

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
        perItemTransport,
        notes: batch.notes,
        originalFileName: batch.originalFileName,
      },
      items,
      statusCounts: countsMap,
      pagination: { page, limit, total: totalItems, pages: Math.ceil(totalItems / limit) },
    })
  } catch (error: any) {
    console.error('GET /api/warehouse/[batchId] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { batchId } = params
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

export async function DELETE(req: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { batchId } = params

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
