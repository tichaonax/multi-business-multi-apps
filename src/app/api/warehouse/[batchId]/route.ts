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
        // Most recently added/updated first in every status tab -- moving,
        // editing, or scanning a barcode onto an item all bump updatedAt, so
        // whatever was just touched surfaces at the top instead of requiring
        // a scroll back to find it.
        orderBy: [{ updatedAt: 'desc' }],
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
    // MBM-300 follow-up — once an item has been moved, its SKU/barcode live on
    // the resulting BusinessProducts row (barcode can also be assigned later,
    // well after the move, via the normal product editor) — fetch live so
    // this view always reflects the current assigned values, not just
    // whatever was true at move time.
    const movedProductIds = [...new Set(prismaItems.map((i: any) => i.businessProductId).filter(Boolean))] as string[]
    const linkedProducts = movedProductIds.length > 0
      ? await (prisma as any).businessProducts.findMany({
          where: { id: { in: movedProductIds } },
          select: {
            id: true, sku: true, barcode: true, businessId: true, businessType: true, basePrice: true, categoryId: true,
            costPrice: true, isBulkStock: true, unitsPerPack: true, bulkPackCost: true,
            product_variants: { select: { stockQuantity: true }, take: 1 },
          },
        })
      : []
    const linkedProductMap = new Map(linkedProducts.map((p: any) => [p.id, p]))

    // Domain -> Category -> Subcategory breadcrumb for each linked product's
    // leaf categoryId, so the batch view can show the same classification
    // the Move page captured without opening Edit Item. Mirrors the exact
    // "group" semantics used there and in universal-inventory-form.tsx: a
    // leaf whose immediate parent is a "group" category (attributes.isGroup,
    // e.g. "Phones And Mobile Accessories") displays as
    // Category=<group>/Subcategory=<leaf>; a plain leaf (no group parent)
    // displays as Category=<leaf> with no subcategory, matching what Edit
    // Item shows for that same product.
    const leafCategoryIds = [...new Set(linkedProducts.map((p: any) => p.categoryId).filter(Boolean))] as string[]
    const categoryBreadcrumbMap = new Map<string, {
      domainName: string | null; domainEmoji: string | null
      categoryName: string; categoryEmoji: string
      subcategoryName: string | null; subcategoryEmoji: string | null
    }>()
    if (leafCategoryIds.length > 0) {
      // Gather the leaf plus ancestor levels (leaf -> group/parent -> that
      // parent's own parent, if any) needed to resolve domain + group name.
      const byId = new Map<string, any>()
      let toFetch = new Set<string>(leafCategoryIds)
      for (let depth = 0; depth < 3 && toFetch.size > 0; depth++) {
        const rows = await (prisma as any).businessCategories.findMany({
          where: { id: { in: [...toFetch] } },
          include: { domain: true },
        })
        const nextToFetch = new Set<string>()
        for (const r of rows) {
          byId.set(r.id, r)
          if (r.parentId && !byId.has(r.parentId)) nextToFetch.add(r.parentId)
        }
        toFetch = nextToFetch
      }
      const resolveDomain = (cat: any): any => {
        let current = cat
        const seen = new Set<string>()
        while (current) {
          if (current.domain) return current.domain
          if (!current.parentId || seen.has(current.id)) return null
          seen.add(current.id)
          current = byId.get(current.parentId)
        }
        return null
      }
      for (const leafId of leafCategoryIds) {
        const leaf = byId.get(leafId)
        if (!leaf) continue
        const parent = leaf.parentId ? byId.get(leaf.parentId) : null
        const parentIsGroup = !!(parent?.attributes && parent.attributes.isGroup === true)
        const domain = resolveDomain(leaf)
        categoryBreadcrumbMap.set(leafId, parentIsGroup
          ? {
              domainName: domain?.name ?? null, domainEmoji: domain?.emoji ?? null,
              categoryName: parent.name, categoryEmoji: parent.emoji || '📦',
              subcategoryName: leaf.name, subcategoryEmoji: leaf.emoji || null,
            }
          : {
              domainName: domain?.name ?? null, domainEmoji: domain?.emoji ?? null,
              categoryName: leaf.name, categoryEmoji: leaf.emoji || '📦',
              subcategoryName: null, subcategoryEmoji: null,
            })
      }
    }

    // The price the item was actually moved at is never overwritten in place
    // — the FIRST (oldest) SELLING history row's oldPrice is exactly that
    // baseline, captured automatically the first time the price is ever
    // edited afterward. One query for every linked product, grouped in JS,
    // rather than an N+1 per item.
    const priceHistoryRows = movedProductIds.length > 0
      ? await (prisma as any).productPriceHistory.findMany({
          where: { catalogSource: 'BUSINESS_PRODUCT', productRefId: { in: movedProductIds }, priceType: 'SELLING' },
          orderBy: { createdAt: 'asc' },
          select: { productRefId: true, oldPrice: true, newPrice: true, reason: true, changeReason: true, createdAt: true },
        })
      : []
    const priceHistoryByProduct = new Map<string, { original: any; latest: any }>()
    for (const row of priceHistoryRows) {
      const entry = priceHistoryByProduct.get(row.productRefId)
      if (!entry) priceHistoryByProduct.set(row.productRefId, { original: row, latest: row })
      else entry.latest = row // rows arrive oldest-first, so the last one seen per product is the most recent
    }

    const items = prismaItems.map((i: any) => {
      const linked: any = i.businessProductId ? linkedProductMap.get(i.businessProductId) : null
      const priceHistory = i.businessProductId ? priceHistoryByProduct.get(i.businessProductId) : null
      const breadcrumb = linked?.categoryId ? categoryBreadcrumbMap.get(linked.categoryId) : null
      return {
        ...i,
        ...(itemExtras[i.id] ?? { originalQty: null, originalPriceYuan: null, qtyChangeReason: null, manifestQty: null, orderedQty: null }),
        linkedProductSku: linked?.sku ?? null,
        linkedProductBarcode: linked?.barcode ?? null,
        linkedProductBusinessId: linked?.businessId ?? null,
        linkedProductBusinessType: linked?.businessType ?? null,
        linkedProductCurrentPrice: linked?.basePrice != null ? Number(linked.basePrice) : null,
        // Bulk-stock conversion — when true, cost/price/stock below are real
        // individual-unit values (not the packet-level figures this item's
        // own warehouse-side economics above still show), so the UI can
        // flag it and keep both sets of numbers visible rather than one
        // silently overwriting the other.
        linkedProductIsBulkStock: linked?.isBulkStock ?? false,
        linkedProductUnitsPerPack: linked?.unitsPerPack ?? null,
        linkedProductBulkPackCost: linked?.bulkPackCost != null ? Number(linked.bulkPackCost) : null,
        linkedProductCurrentCost: linked?.costPrice != null ? Number(linked.costPrice) : null,
        linkedProductCurrentStock: linked?.product_variants?.[0]?.stockQuantity ?? null,
        // null unless the price has actually been edited since the move —
        // no history row exists yet for a product whose price never changed.
        linkedProductOriginalPrice: priceHistory ? Number(priceHistory.original.oldPrice) : null,
        linkedProductPriceChangeReason: priceHistory ? (priceHistory.latest.reason || priceHistory.latest.changeReason) : null,
        linkedProductPriceChangedAt: priceHistory ? priceHistory.latest.createdAt : null,
        linkedProductDomainName: breadcrumb?.domainName ?? null,
        linkedProductDomainEmoji: breadcrumb?.domainEmoji ?? null,
        linkedProductCategoryName: breadcrumb?.categoryName ?? null,
        linkedProductCategoryEmoji: breadcrumb?.categoryEmoji ?? null,
        linkedProductSubcategoryName: breadcrumb?.subcategoryName ?? null,
        linkedProductSubcategoryEmoji: breadcrumb?.subcategoryEmoji ?? null,
      }
    })

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

    // Move Sessions — every item moved together in one "Move to Business"
    // action, most recent first, so the batch page can offer a way back into
    // that exact set of items (which the Move page itself already renders,
    // filtered to a sessionId, since it loads status=ALL regardless).
    const sessionRows: any[] = await prisma.$queryRaw`
      SELECT
        wi."moveSessionId" as "sessionId",
        COUNT(*)::int as "itemCount",
        MAX(wi."movedAt") as "movedAt",
        MAX(bp."businessId") as "businessId",
        MAX(b.name) as "businessName",
        SUM(bp."basePrice" * COALESCE(wi."manifestQty", wi."quantity", 1) * COALESCE(wi."itemsPerPacket", 1)) as "expectedSellingTotal"
      FROM warehouse_items wi
      LEFT JOIN business_products bp ON bp.id = wi."businessProductId"
      LEFT JOIN businesses b ON b.id = bp."businessId"
      WHERE wi."batchId" = ${batchId} AND wi."moveSessionId" IS NOT NULL
      GROUP BY wi."moveSessionId"
      ORDER BY MAX(wi."movedAt") DESC
    `
    const moveSessions = sessionRows.map(s => ({
      sessionId: s.sessionId,
      itemCount: s.itemCount,
      movedAt: s.movedAt,
      businessId: s.businessId,
      businessName: s.businessName,
      // Expected revenue if every unit in this session sells at its current
      // selling price (basePrice) -- basePrice is per-unit, so multiplied by
      // each item's manifestQty (falling back to quantity, then 1).
      expectedSellingTotal: s.expectedSellingTotal != null ? Number(s.expectedSellingTotal) : null,
    }))

    // Transport cost per item (eligible = IN_WAREHOUSE only)
    const inWarehouseCount = countsMap['IN_WAREHOUSE'] || 0
    const perItemTransport = (batch.pickedUpAtCollectionPoint && batch.collectionTransportCost && inWarehouseCount > 0)
      ? Number(batch.collectionTransportCost) / inWarehouseCount
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
        pickedUpAtCollectionPoint: batch.pickedUpAtCollectionPoint,
        collectionTransportCost: batch.collectionTransportCost,
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
      moveSessions,
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

    const allowedFields = ['pickedUpAtCollectionPoint', 'collectionTransportCost', 'notes', 'batchName']
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
