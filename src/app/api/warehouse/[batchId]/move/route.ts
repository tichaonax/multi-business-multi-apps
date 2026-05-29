import { NextRequest, NextResponse } from 'next/server'
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

    // Compute per-item transport cost
    const inWarehouseCount = await (prisma as any).warehouseItems.count({ where: { batchId, status: 'IN_WAREHOUSE' } })
    const perItemTransport = (batch.pickedUpFromHarare && batch.transportCostHarare && inWarehouseCount > 0)
      ? Number(batch.transportCostHarare) / inWarehouseCount
      : 0

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
    const results: Array<{ itemId: string; productId: string; sku: string }> = []

    for (const warehouseItem of warehouseItems) {
      const move = itemMoves.find((m: any) => m.itemId === warehouseItem.id)
      if (!move) continue

      const itemCategoryId = move.categoryId || globalCategoryId
      // Use manifestQty (received qty) for stock — this is what physically arrived
      const qty = manifestMap[warehouseItem.id] ?? warehouseItem.quantity ?? 1
      const costUsdPerUnit = Number(warehouseItem.costUsd || 0) / qty
      const transportPerUnit = perItemTransport / qty
      const txFeePerUnit = batch.transactionFeePct ? costUsdPerUnit * (Number(batch.transactionFeePct) / 100) : 0
      const costPrice = costUsdPerUnit + transportPerUnit + txFeePerUnit
      const sellingPrice = Number(move.sellingPrice) || costPrice

      // SKU: unique short code derived from item id
      const sku = `WH-${warehouseItem.id.slice(0, 10).toUpperCase()}`
      const productName = warehouseItem.shortName || warehouseItem.productName.slice(0, 100)

      await (prisma as any).$transaction(async (tx: any) => {
        // Create product
        const product = await tx.businessProducts.create({
          data: {
            businessId,
            businessType,
            categoryId: itemCategoryId,
            name: productName,
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
            updatedAt: movedAt,
          }
        })

        results.push({ itemId: warehouseItem.id, productId: product.id, sku })
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
    })
  } catch (error: any) {
    console.error('POST /api/warehouse/[batchId]/move error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
