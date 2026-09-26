import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { recalcAndAutoLock } from '@/lib/warehouse-auto-lock'

export async function POST(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const canMove = isAdmin || (user.permissions as any)?.canMoveWarehouseToInventory === true
    if (!canMove) return NextResponse.json({ error: 'Insufficient permissions — requires canMoveWarehouseToInventory' }, { status: 403 })

    const { batchId } = await params
    const body = await req.json()

    // Required: target business + list of items; categoryId can be per-item or global fallback
    const { businessId, businessType, categoryId: globalCategoryId, items: itemMoves } = body
    // itemMoves: Array<{ itemId: string, sellingPrice: number, barcode?: string, categoryId?: string }>
    if (!businessId || !businessType || !Array.isArray(itemMoves) || itemMoves.length === 0) {
      return NextResponse.json({ error: 'businessId, businessType, and items[] are required' }, { status: 400 })
    }
    // Every item must resolve to a category (per-item or global fallback)
    const missingCategory = itemMoves.find((m: any) => !m.categoryId && !globalCategoryId)
    if (missingCategory) {
      return NextResponse.json({ error: 'Each item must have a categoryId, or a global categoryId must be provided' }, { status: 400 })
    }

    const batch = await (prisma as any).warehouseBatches.findUnique({ where: { id: batchId } })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    // Groups every item moved together in this one request so a "Move
    // Sessions" view can later show exactly what was moved together, not
    // just each item's own movedAt. A bulk "Move Selected" spanning several
    // target businesses makes one request per business, so each business's
    // items form their own session -- consistent with everything else here
    // (categories, SKUs) already being scoped per target business.
    const moveSessionId = randomUUID()

    // Compute per-item transport cost
    const inWarehouseCount = await (prisma as any).warehouseItems.count({ where: { batchId, status: 'IN_WAREHOUSE' } })
    const perItemTransport = (batch.pickedUpAtCollectionPoint && batch.collectionTransportCost && inWarehouseCount > 0)
      ? Number(batch.collectionTransportCost) / inWarehouseCount
      : 0

    // Validate subcategoryIds up front (same rule the standard product-edit
    // route enforces) — a subcategory pick that doesn't resolve to a real
    // InventorySubcategories row is silently dropped rather than persisted,
    // since that would otherwise 400 later when the product is edited.
    const candidateSubcategoryIds = [...new Set(itemMoves.map((m: any) => m.subcategoryId).filter(Boolean))] as string[]
    const validSubcategories = candidateSubcategoryIds.length > 0
      ? await (prisma as any).inventorySubcategories.findMany({ where: { id: { in: candidateSubcategoryIds } }, select: { id: true } })
      : []
    const validSubcategoryIds = new Set(validSubcategories.map((s: any) => s.id))

    // Validate categoryIds belong to THIS business (or are shared/template
    // categories with no businessId, matching this businessType). "Suggest"
    // on the Move page draws from a business-agnostic category list (it has
    // to, since a batch can target different businesses per row) — accepting
    // its pick at face value without this check let a category belonging to
    // a DIFFERENT business through, which crashed the create with a raw FK
    // violation instead of a usable error.
    const candidateCategoryIds = [...new Set(itemMoves.map((m: any) => m.categoryId || globalCategoryId).filter(Boolean))] as string[]
    const validCategories = candidateCategoryIds.length > 0
      ? await (prisma as any).businessCategories.findMany({
          where: { id: { in: candidateCategoryIds }, businessType, OR: [{ businessId }, { businessId: null }] },
          select: { id: true, attributes: true },
        })
      : []
    // "Group" categories (attributes.isGroup, e.g. "Phones And Mobile
    // Accessories") are organizational/display-only -- they have no domain
    // of their own and were never meant to be a product's real leaf
    // category. The Move page's picker treats them as a Category tier node
    // specifically so their real children can be picked as the Subcategory,
    // but if a row's category is left on the group itself (no subcategory
    // drilled into), reject it here rather than persist an unusable leaf.
    const groupCategoryIds = new Set(validCategories.filter((c: any) => c.attributes?.isGroup === true).map((c: any) => c.id))
    const validCategoryIds = new Set(validCategories.map((c: any) => c.id))
    const invalidCategoryItem = itemMoves.find((m: any) => !validCategoryIds.has(m.categoryId || globalCategoryId))
    if (invalidCategoryItem) {
      return NextResponse.json({
        error: 'One or more selected categories don\'t belong to this business — re-select the category/subcategory for the affected item(s) and try again.'
      }, { status: 400 })
    }
    const unresolvedGroupItem = itemMoves.find((m: any) => groupCategoryIds.has(m.categoryId || globalCategoryId))
    if (unresolvedGroupItem) {
      return NextResponse.json({
        error: 'One or more items are still set to a category group (e.g. "Phones And Mobile Accessories") — pick the specific item underneath it, not the group itself.'
      }, { status: 400 })
    }

    const itemIds = itemMoves.map((m: any) => m.itemId)
    const warehouseItems = await (prisma as any).warehouseItems.findMany({
      where: { id: { in: itemIds }, batchId, status: 'IN_WAREHOUSE' },
    })
    if (warehouseItems.length === 0) {
      return NextResponse.json({ error: 'No eligible IN_WAREHOUSE items found' }, { status: 400 })
    }

    // Fetch manifestQty via raw SQL (column not in generated Prisma client)
    const manifestRows: any[] = await prisma.$queryRaw`
      SELECT id, "manifestQty" FROM warehouse_items WHERE id = ANY(${itemIds}::text[])
    `
    const manifestMap: Record<string, number | null> = {}
    for (const r of manifestRows) {
      manifestMap[r.id] = r.manifestQty != null ? Number(r.manifestQty) : null
    }

    // Block if any item has null or 0 manifestQty
    const missingManifest = warehouseItems.find((i: any) => {
      const mq = manifestMap[i.id]
      return mq == null || mq === 0
    })
    if (missingManifest) {
      const mq = manifestMap[missingManifest.id]
      return NextResponse.json({
        error: `Item "${missingManifest.shortName || missingManifest.orderNumber}" has ${mq == null ? 'unknown' : 'zero'} Manifest Qty — set the received quantity before moving`
      }, { status: 400 })
    }

    // ORDER MAX check: for each unique orderNumber, verify total doesn't exceed the order max
    const uniqueOrderNumbers = [...new Set<string>(warehouseItems.map((i: any) => i.orderNumber).filter(Boolean))]
    for (const orderNumber of uniqueOrderNumbers) {
      const orderMaxRows: any[] = await prisma.$queryRaw`
        SELECT COALESCE(SUM("orderedQty"), 0) AS "orderMax"
        FROM warehouse_order_refs WHERE "orderNumber" = ${orderNumber}
      `
      const orderMax = orderMaxRows.length > 0 ? Number(orderMaxRows[0].orderMax) : 0
      if (orderMax === 0) continue   // no ref data — skip check

      const alreadyMovedRows: any[] = await prisma.$queryRaw`
        SELECT COALESCE(SUM("manifestQty"), 0) AS "moved"
        FROM warehouse_items
        WHERE "orderNumber" = ${orderNumber} AND status = 'MOVED_TO_BUSINESS'
      `
      const alreadyMoved = alreadyMovedRows.length > 0 ? Number(alreadyMovedRows[0].moved) : 0
      const aboutToMove = warehouseItems
        .filter((i: any) => i.orderNumber === orderNumber)
        .reduce((sum: number, i: any) => sum + (manifestMap[i.id] ?? 0), 0)

      if (alreadyMoved + aboutToMove > orderMax) {
        const remaining = Math.max(0, orderMax - alreadyMoved)
        return NextResponse.json({
          error: `Order #${orderNumber}: ${alreadyMoved} unit(s) already processed. Moving these items would add ${aboutToMove} more, exceeding the order max of ${orderMax}. Max remaining: ${remaining}`
        }, { status: 400 })
      }
    }

    const movedAt = new Date()
    const results: Array<{ itemId: string; productId: string; sku: string; sellingPrice: number }> = []

    for (const warehouseItem of warehouseItems) {
      const move = itemMoves.find((m: any) => m.itemId === warehouseItem.id)
      if (!move) continue

      const itemCategoryId = move.categoryId || globalCategoryId
      const itemSubcategoryId = move.subcategoryId && validSubcategoryIds.has(move.subcategoryId) ? move.subcategoryId : null
      // Use manifestQty (received qty) for stock — this is what physically arrived
      const qty = manifestMap[warehouseItem.id] ?? warehouseItem.quantity ?? 1
      // MBM-300 — a Container Batch reconciliation already gives an exact,
      // fully-loaded per-unit landed cost (unit + clearance + shipping),
      // which is strictly more accurate than this pro-rata estimate. Prefer
      // it when present; fall back to the original estimate for items that
      // only ever went through the early Yuan-stage import.
      let costPrice: number
      if (warehouseItem.landedCost != null) {
        costPrice = Number(warehouseItem.landedCost)
      } else {
        const costUsdPerUnit = Number(warehouseItem.costUsd || 0) / qty
        const transportPerUnit = perItemTransport / qty
        const txFeePerUnit = batch.transactionFeePct ? costUsdPerUnit * (Number(batch.transactionFeePct) / 100) : 0
        costPrice = costUsdPerUnit + transportPerUnit + txFeePerUnit
      }
      const rawSellingPrice = Number(move.sellingPrice) || Number(warehouseItem.estSellingPrice) || costPrice
      // Round UP to the nearest $1.00 at the moment a price becomes real
      // (i.e. right as the SKU is assigned) — e.g. 55.19 -> 56.00, 55.70 -> 56.00.
      const sellingPrice = Math.ceil(rawSellingPrice)

      // SKU: unique short code derived from item id
      const sku = `WH-${warehouseItem.id.slice(0, 10).toUpperCase()}`
      const productName = warehouseItem.shortName || warehouseItem.productName.slice(0, 100)
      // Traceability back to the source shipment — the ONLY place order #/
      // tracking # end up on the resulting product, so they must be
      // searchable text, not just a display field. Also carries the full,
      // untruncated original product name for when `name` above was shortened.
      const descriptionParts = [
        warehouseItem.productName,
        `Order #${warehouseItem.orderNumber}`,
        warehouseItem.trackingNumber ? `Tracking ${warehouseItem.trackingNumber}` : null,
      ].filter(Boolean)
      const description = descriptionParts.join(' · ')

      await (prisma as any).$transaction(async (tx: any) => {
        // Create product
        const product = await tx.businessProducts.create({
          data: {
            businessId,
            businessType,
            categoryId: itemCategoryId,
            subcategoryId: itemSubcategoryId,
            name: productName,
            description,
            sku,
            barcode: move.barcode || null,
            basePrice: sellingPrice,
            costPrice: costPrice > 0 ? costPrice : null,
            productType: 'PHYSICAL',
            condition: 'NEW',
            isActive: true,
            isAvailable: true,
            isInventoryTracked: true,
            updatedAt: movedAt,
          }
        })

        // Create default variant
        const variant = await tx.productVariants.create({
          data: {
            productId: product.id,
            name: 'Default',
            sku: `${sku}-V1`,
            barcode: move.barcode || null,
            price: sellingPrice,
            stockQuantity: qty,
            reorderLevel: 0,
            isActive: true,
            isAvailable: true,
            updatedAt: movedAt,
          }
        })

        // Stock movement IN
        await tx.businessStockMovements.create({
          data: {
            businessId,
            businessType,
            businessProductId: product.id,
            productVariantId: variant.id,
            movementType: 'PURCHASE_RECEIVED',
            quantity: qty,
            unitCost: costPrice > 0 ? costPrice : null,
            reference: warehouseItem.id,
            reason: `Warehouse import — ${batch.batchName}`,
          }
        })

        // Register barcode so scanner can find the product
        if (move.barcode) {
          await tx.productBarcodes.create({
            data: {
              productId: product.id,
              variantId: variant.id,
              businessId,
              code: move.barcode,
              type: 'CODE128',
              isPrimary: true,
              isActive: true,
            }
          })
        }

        // Product image if imageId exists
        if (warehouseItem.imageId) {
          await tx.productImages.create({
            data: {
              productId: product.id,
              imageUrl: `/api/images/${warehouseItem.imageId}`,
              imageId: warehouseItem.imageId,
              isPrimary: true,
              sortOrder: 0,
              businessType,
              updatedAt: movedAt,
            }
          })
        }

        // Mark warehouse item as moved
        await tx.warehouseItems.update({
          where: { id: warehouseItem.id },
          data: {
            status: 'MOVED_TO_BUSINESS',
            businessProductId: product.id,
            movedAt,
            movedBy: user.id,
            moveSessionId,
            updatedAt: movedAt,
          }
        })

        results.push({ itemId: warehouseItem.id, productId: product.id, sku, sellingPrice })
      })
    }

    // Trigger auto-lock evaluation for all moved references
    const movedOrderNums = warehouseItems.map((i: any) => i.orderNumber).filter(Boolean)
    const movedTrackNums = warehouseItems.map((i: any) => i.trackingNumber).filter(Boolean)
    await recalcAndAutoLock(prisma as any, movedOrderNums, movedTrackNums)

    return NextResponse.json({
      success: true,
      movedCount: results.length,
      items: results,
      moveSessionId,
    })
  } catch (error: any) {
    console.error('POST /api/warehouse/[batchId]/move error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
