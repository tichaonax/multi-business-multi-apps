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

    // Groups every item moved together into one "session" for the Move
    // Sessions view. A session isn't just "this one API call" -- moving 10
    // items one row at a time makes 10 separate calls, and those should
    // still land in one session if done in one sitting. So: reuse the most
    // recent session for this same (batch, target business) if its last
    // move was within the last 30 minutes; otherwise start a fresh one. A
    // bulk "Move Selected" spanning several target businesses makes one
    // request per business, so each business's items still form their own
    // session -- consistent with everything else here (categories, SKUs)
    // already being scoped per target business.
    const SESSION_GAP_MS = 30 * 60 * 1000
    const recentSessionRows: any[] = await prisma.$queryRaw`
      SELECT wi."moveSessionId" as "sessionId"
      FROM warehouse_items wi
      JOIN business_products bp ON bp.id = wi."businessProductId"
      WHERE wi."batchId" = ${batchId}
        AND bp."businessId" = ${businessId}
        AND wi."moveSessionId" IS NOT NULL
        AND wi."movedAt" >= ${new Date(Date.now() - SESSION_GAP_MS)}
      ORDER BY wi."movedAt" DESC
      LIMIT 1
    `
    const moveSessionId = recentSessionRows[0]?.sessionId ?? randomUUID()

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
    const results: Array<{ itemId: string; productId: string; sku: string; sellingPrice: number; matched: boolean; action: 'created' | 'topped_up' }> = []

    for (const warehouseItem of warehouseItems) {
      const move = itemMoves.find((m: any) => m.itemId === warehouseItem.id)
      if (!move) continue

      const itemCategoryId = move.categoryId || globalCategoryId
      const itemSubcategoryId = move.subcategoryId && validSubcategoryIds.has(move.subcategoryId) ? move.subcategoryId : null
      // Use manifestQty (received qty) for stock — this is what physically arrived.
      // When bulk info is provided, this is the PACKET count; the individual
      // sellable-unit count is derived below (packetQty * itemsPerPacket).
      const packetQty = manifestMap[warehouseItem.id] ?? warehouseItem.quantity ?? 1
      // MBM-300 — a Container Batch reconciliation already gives an exact,
      // fully-loaded per-unit landed cost (unit + clearance + shipping),
      // which is strictly more accurate than this pro-rata estimate. Prefer
      // it when present; fall back to the original estimate for items that
      // only ever went through the early Yuan-stage import. This is the
      // PACKET-level cost when bulk info is provided.
      let packetCostPrice: number
      if (warehouseItem.landedCost != null) {
        packetCostPrice = Number(warehouseItem.landedCost)
      } else {
        const costUsdPerUnit = Number(warehouseItem.costUsd || 0) / packetQty
        const transportPerUnit = perItemTransport / packetQty
        const txFeePerUnit = batch.transactionFeePct ? costUsdPerUnit * (Number(batch.transactionFeePct) / 100) : 0
        packetCostPrice = costUsdPerUnit + transportPerUnit + txFeePerUnit
      }
      const rawPacketSellingPrice = Number(move.sellingPrice) || Number(warehouseItem.estSellingPrice) || packetCostPrice
      // Round UP to the nearest $1.00 at the moment a price becomes real
      // (i.e. right as the SKU is assigned) — e.g. 55.19 -> 56.00, 55.70 -> 56.00.
      // Applies to the PACKET price the user actually entered/reviewed; the
      // derived individual-unit price below is NOT further rounded, since
      // rounding e.g. $1.80/unit up to $2 would be a large, unintended hike.
      const packetSellingPrice = Math.ceil(rawPacketSellingPrice)

      // Bulk-stock conversion — NOT the same thing as an existing item's own
      // bulk classification, which always wins if this row matches one (see
      // the match step below). This is only used when creating a new item.
      const isBulk = !!move.isBulkStock && Number.isFinite(Number(move.itemsPerPacket)) && Number(move.itemsPerPacket) > 1
      const itemsPerPacket = isBulk ? Math.floor(Number(move.itemsPerPacket)) : null
      const newItemQty = isBulk ? packetQty * itemsPerPacket! : packetQty
      const newItemCostPrice = isBulk ? Math.round((packetCostPrice / itemsPerPacket!) * 100) / 100 : packetCostPrice
      const newItemSellingPrice = isBulk
        ? (move.unitSellingPrice != null && Number(move.unitSellingPrice) > 0
            ? Number(move.unitSellingPrice)
            : Math.round((packetSellingPrice / itemsPerPacket!) * 100) / 100)
        : packetSellingPrice

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
        // Item matching — no automatic matching existed anywhere for this
        // catalog before; barcode first, case-insensitive exact name as
        // fallback (same priority order the OTHER catalog's bulk-add-stock
        // route already uses). When matched, the EXISTING product's own
        // bulk classification always wins (Required Workflow #5) — this
        // row's own isBulkStock/itemsPerPacket input, if any, is ignored.
        let existingProduct: any = null
        let existingVariant: any = null
        if (move.barcode) {
          const existingBarcode = await tx.productBarcodes.findFirst({ where: { code: move.barcode, businessId } })
          if (existingBarcode) {
            existingProduct = await tx.businessProducts.findUnique({ where: { id: existingBarcode.productId } })
            existingVariant = existingBarcode.variantId
              ? await tx.productVariants.findUnique({ where: { id: existingBarcode.variantId } })
              : await tx.productVariants.findFirst({ where: { productId: existingBarcode.productId, isActive: true } })
          }
        }
        if (!existingProduct) {
          existingProduct = await tx.businessProducts.findFirst({
            where: { businessId, name: { equals: productName, mode: 'insensitive' }, isActive: true },
          })
          if (existingProduct) {
            existingVariant = await tx.productVariants.findFirst({ where: { productId: existingProduct.id, isActive: true } })
          }
        }

        if (existingProduct && existingVariant) {
          // Top up — never create a duplicate product for the same physical item.
          const existingIsBulk = existingProduct.isBulkStock === true
          const existingUnitsPerPack = existingProduct.unitsPerPack ?? null
          const incomingQty = existingIsBulk && existingUnitsPerPack ? packetQty * existingUnitsPerPack : packetQty
          const incomingCostPerUnit = existingIsBulk && existingUnitsPerPack
            ? Math.round((packetCostPrice / existingUnitsPerPack) * 100) / 100
            : packetCostPrice
          const existingStockQty = Number(existingVariant.stockQuantity || 0)
          const existingCostPerUnit = existingProduct.costPrice != null ? Number(existingProduct.costPrice) : incomingCostPerUnit
          // Weighted-average cost, same formula already used by
          // bulk-top-up-form.tsx for the other catalog.
          const blendedCostPerUnit = existingStockQty + incomingQty > 0
            ? Math.round(((existingStockQty * existingCostPerUnit + incomingQty * incomingCostPerUnit) / (existingStockQty + incomingQty)) * 100) / 100
            : incomingCostPerUnit
          const topUpSellingPrice = existingIsBulk && existingUnitsPerPack
            ? (move.unitSellingPrice != null && Number(move.unitSellingPrice) > 0 ? Number(move.unitSellingPrice) : Math.round((packetSellingPrice / existingUnitsPerPack) * 100) / 100)
            : packetSellingPrice

          await tx.productVariants.update({
            where: { id: existingVariant.id },
            data: { stockQuantity: { increment: incomingQty }, price: topUpSellingPrice, updatedAt: movedAt },
          })
          await tx.businessProducts.update({
            where: { id: existingProduct.id },
            data: { costPrice: blendedCostPerUnit, basePrice: topUpSellingPrice, updatedAt: movedAt },
          })
          await tx.businessStockMovements.create({
            data: {
              businessId,
              businessType,
              businessProductId: existingProduct.id,
              productVariantId: existingVariant.id,
              movementType: 'PURCHASE_RECEIVED',
              quantity: incomingQty,
              unitCost: incomingCostPerUnit > 0 ? incomingCostPerUnit : null,
              reference: warehouseItem.id,
              reason: `Warehouse import — ${batch.batchName} (matched existing item)`,
            }
          })
          // Add a secondary barcode if this row supplied one the existing
          // product doesn't already have (matched by name, not barcode).
          if (move.barcode) {
            const alreadyLinked = await tx.productBarcodes.findFirst({ where: { code: move.barcode, businessId } })
            if (!alreadyLinked) {
              await tx.productBarcodes.create({
                data: {
                  productId: existingProduct.id,
                  variantId: existingVariant.id,
                  businessId,
                  code: move.barcode,
                  type: 'CODE128',
                  isPrimary: false,
                  isActive: true,
                }
              })
            }
          }

          await tx.warehouseItems.update({
            where: { id: warehouseItem.id },
            data: {
              status: 'MOVED_TO_BUSINESS',
              businessProductId: existingProduct.id,
              movedAt,
              movedBy: user.id,
              moveSessionId,
              // Sync note: this row's own manifestQty is a packet count when
              // the matched product is bulk — record the conversion factor
              // so anything totalling manifestQty x price stays correct.
              itemsPerPacket: existingIsBulk && existingUnitsPerPack ? existingUnitsPerPack : null,
              updatedAt: movedAt,
            }
          })

          results.push({ itemId: warehouseItem.id, productId: existingProduct.id, sku: existingProduct.sku || sku, sellingPrice: topUpSellingPrice, matched: true, action: 'topped_up' })
          return
        }

        // No match — create a new product, applying this row's own bulk
        // settings (if any).
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
            basePrice: newItemSellingPrice,
            costPrice: newItemCostPrice > 0 ? newItemCostPrice : null,
            productType: 'PHYSICAL',
            condition: 'NEW',
            isActive: true,
            isAvailable: true,
            isInventoryTracked: true,
            isBulkStock: isBulk,
            unitsPerPack: isBulk ? itemsPerPacket : null,
            bulkPackCost: isBulk ? packetCostPrice : null,
            bulkConvertedAt: isBulk ? movedAt : null,
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
            price: newItemSellingPrice,
            stockQuantity: newItemQty,
            reorderLevel: 0,
            isActive: true,
            isAvailable: true,
            updatedAt: movedAt,
          }
        })

        // Stock movement IN — already at the converted (individual-unit)
        // quantity/cost when bulk, so there's exactly one movement, never a
        // separate "convert after create" step.
        await tx.businessStockMovements.create({
          data: {
            businessId,
            businessType,
            businessProductId: product.id,
            productVariantId: variant.id,
            movementType: 'PURCHASE_RECEIVED',
            quantity: newItemQty,
            unitCost: newItemCostPrice > 0 ? newItemCostPrice : null,
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
            itemsPerPacket: isBulk ? itemsPerPacket : null,
            updatedAt: movedAt,
          }
        })

        results.push({ itemId: warehouseItem.id, productId: product.id, sku, sellingPrice: newItemSellingPrice, matched: false, action: 'created' })
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
