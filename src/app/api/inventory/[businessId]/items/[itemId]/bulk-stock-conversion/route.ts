import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import { createAuditLog } from '@/lib/audit'
import { recordPriceChangeIfDifferent } from '@/lib/inventory/price-history'

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * POST /api/inventory/[businessId]/items/[itemId]/bulk-stock-conversion
 *
 * Bulk-stock conversion — a real unit-of-measure conversion: an item
 * recorded as N packets, each containing `itemsPerPacket` sellable items,
 * becomes N x itemsPerPacket individual units. Total inventory value is
 * preserved (quantity x unitCost stays the same); selling price defaults
 * to the current price / itemsPerPacket but may be overridden.
 *
 * Deliberately separate from bulk-pack-correction (which only ever
 * corrects a *reported* cost figure and is freely re-editable) — this
 * endpoint changes real stock quantity.
 *
 * Reads current stockQuantity inside the same transaction that writes the
 * conversion, so a sale that happens concurrently can't be silently
 * overwritten or double-counted (Required Workflow #3 — always converts
 * whatever is actually on hand right now, never the original received qty).
 *
 * Re-running this on an already-converted item is allowed ONLY as a
 * correction of a mis-entered packet size, and ONLY while nothing has been
 * sold/moved since the original conversion — the moment any other stock
 * movement exists after `bulkConvertedAt`, the conversion is permanent and
 * this endpoint rejects (409). A correction re-derives the pre-conversion
 * packet count from the current stock and the OLD unitsPerPack (safe,
 * since nothing has touched stock since then) and applies the NEW
 * itemsPerPacket from that same packet count — not by compounding onto
 * the already-converted numbers.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; itemId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, itemId } = await params
    const canConvert = isSystemAdmin(user) || hasPermission(user, 'canManageInventory', businessId)
    if (!canConvert) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const itemsPerPacket = parseInt(body.itemsPerPacket, 10)
    if (!Number.isFinite(itemsPerPacket) || itemsPerPacket < 2) {
      return NextResponse.json({ error: 'Items per packet must be a whole number of 2 or more' }, { status: 400 })
    }
    const unitSellingPriceOverride = body.unitSellingPrice != null && Number(body.unitSellingPrice) > 0
      ? Number(body.unitSellingPrice)
      : null
    // Optional correction of the recorded packet cost, only meaningful on a redo.
    const bulkPackCostOverride = body.bulkPackCost != null && Number(body.bulkPackCost) > 0
      ? Number(body.bulkPackCost)
      : null

    const isBarcodeItem = itemId.startsWith('inv_')
    const rawId = isBarcodeItem ? itemId.replace(/^inv_/, '') : itemId

    if (isBarcodeItem) {
      const existing = await prisma.barcodeInventoryItems.findFirst({ where: { id: rawId, businessId }, include: { business: { select: { type: true } } } })
      if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      const barcodeItemBusinessType = existing.business.type

      let isRedo = false
      if ((existing as any).isBulkStock) {
        const convertedAt = (existing as any).bulkConvertedAt as Date | null
        const movedSince = convertedAt
          ? await prisma.businessStockMovements.count({
              where: { barcodeInventoryItemId: rawId, createdAt: { gt: convertedAt } },
            })
          : 1 // no timestamp on file — can't prove nothing moved, so don't allow a redo
        if (movedSince > 0) {
          return NextResponse.json({ error: 'This item has already been converted to bulk stock, and stock has moved since — the conversion is now permanent' }, { status: 409 })
        }
        isRedo = true
      }

      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.barcodeInventoryItems.findUniqueOrThrow({ where: { id: rawId } })
        const currentStock = current.stockQuantity || 0
        const currentCostPrice = current.costPrice != null ? Number(current.costPrice) : 0
        const currentSellingPrice = current.sellingPrice != null ? Number(current.sellingPrice) : 0
        const oldUnitsPerPack = isRedo && current.unitsPerPack ? current.unitsPerPack : 1
        // Re-derive the pre-conversion packet count on a redo (safe — proven
        // nothing has moved since the original conversion); a first-time
        // conversion just treats currentStock as the packet count directly.
        const packetQty = isRedo ? Math.round(currentStock / oldUnitsPerPack) : currentStock
        const packetCost = isRedo ? (bulkPackCostOverride ?? (current.bulkPackCost != null ? Number(current.bulkPackCost) : currentCostPrice)) : currentCostPrice

        const newStock = packetQty * itemsPerPacket
        const newUnitCost = packetCost > 0 ? round2(packetCost / itemsPerPacket) : null
        // No packet-level selling price is preserved (this model has no
        // attributes column to stash one in), so a redo keeps the current
        // unit price unless explicitly overridden, rather than guessing.
        const defaultUnitPrice = isRedo ? currentSellingPrice : (currentSellingPrice > 0 ? round2(currentSellingPrice / itemsPerPacket) : null)
        const newUnitPrice = unitSellingPriceOverride ?? defaultUnitPrice

        await (tx as any).barcodeInventoryItems.update({
          where: { id: rawId },
          data: {
            stockQuantity: newStock,
            costPrice: newUnitCost,
            sellingPrice: newUnitPrice,
            unitsPerPack: itemsPerPacket,
            bulkPackCost: packetCost > 0 ? packetCost : null,
            isBulkStock: true,
            bulkConvertedAt: new Date(),
            updatedAt: new Date(),
          },
        })

        await tx.businessStockMovements.create({
          data: {
            businessId,
            barcodeInventoryItemId: rawId,
            businessType: barcodeItemBusinessType,
            movementType: 'ADJUSTMENT',
            quantity: newStock - currentStock,
            reason: isRedo
              ? `Bulk conversion corrected: ${packetQty} packet(s) → ${newStock} unit(s) @ ${itemsPerPacket}/pack (was ${oldUnitsPerPack}/pack)`
              : `Bulk conversion: ${currentStock} packet(s) → ${newStock} unit(s) @ ${itemsPerPacket}/pack`,
          },
        })

        return { currentStock, currentCostPrice, currentSellingPrice, newStock, newUnitCost, newUnitPrice, name: current.name }
      })

      await Promise.all([
        result.newUnitCost != null
          ? recordPriceChangeIfDifferent({
              businessId, catalogSource: 'BARCODE_ITEM', productRefId: rawId, priceType: 'COST',
              oldPrice: result.currentCostPrice || null, newPrice: result.newUnitCost,
              changedBy: user.id, changeReason: 'BULK_STOCK_CONVERSION', productName: result.name, changedByName: user.name,
            })
          : Promise.resolve(),
        result.newUnitPrice != null
          ? recordPriceChangeIfDifferent({
              businessId, catalogSource: 'BARCODE_ITEM', productRefId: rawId, priceType: 'SELLING',
              oldPrice: result.currentSellingPrice || null, newPrice: result.newUnitPrice,
              changedBy: user.id, changeReason: 'BULK_STOCK_CONVERSION', productName: result.name, changedByName: user.name,
            })
          : Promise.resolve(),
        createAuditLog({
          userId: user.id,
          action: 'PRODUCT_BULK_STOCK_CONVERTED',
          entityType: 'Product',
          entityId: rawId,
          oldValues: { stockQuantity: result.currentStock, costPrice: result.currentCostPrice, sellingPrice: result.currentSellingPrice },
          newValues: { stockQuantity: result.newStock, costPrice: result.newUnitCost, sellingPrice: result.newUnitPrice, itemsPerPacket },
          metadata: { sourceTable: 'BARCODE_ITEM', businessId, productName: result.name, redo: isRedo },
          businessId,
        }),
      ])

      return NextResponse.json({ success: true, stockQuantity: result.newStock, costPrice: result.newUnitCost, sellingPrice: result.newUnitPrice, redo: isRedo })
    }

    const existing = await prisma.businessProducts.findFirst({ where: { id: rawId, businessId } })
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    let isRedo = false
    if ((existing as any).isBulkStock) {
      const convertedAt = (existing as any).bulkConvertedAt as Date | null
      const movedSince = convertedAt
        ? await prisma.businessStockMovements.count({
            where: { businessProductId: rawId, createdAt: { gt: convertedAt } },
          })
        : 1
      if (movedSince > 0) {
        return NextResponse.json({ error: 'This item has already been converted to bulk stock, and stock has moved since — the conversion is now permanent' }, { status: 409 })
      }
      isRedo = true
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentProduct = await tx.businessProducts.findUniqueOrThrow({ where: { id: rawId } })
      let variant = await tx.productVariants.findFirst({ where: { productId: rawId, isActive: true } })
      if (!variant) {
        variant = await tx.productVariants.create({
          data: {
            productId: rawId,
            sku: `${currentProduct.sku || rawId}-default`,
            name: 'Default',
            price: currentProduct.basePrice || 0,
            stockQuantity: 0,
            updatedAt: new Date(),
          },
        })
      }
      const currentStock = variant.stockQuantity || 0
      const currentCostPrice = currentProduct.costPrice != null ? Number(currentProduct.costPrice) : 0
      const currentSellingPrice = Number(variant.price ?? currentProduct.basePrice ?? 0)
      const oldUnitsPerPack = isRedo && (currentProduct as any).unitsPerPack ? (currentProduct as any).unitsPerPack : 1
      const packetQty = isRedo ? Math.round(currentStock / oldUnitsPerPack) : currentStock
      const packetCost = isRedo ? (bulkPackCostOverride ?? ((currentProduct as any).bulkPackCost != null ? Number((currentProduct as any).bulkPackCost) : currentCostPrice)) : currentCostPrice

      const newStock = packetQty * itemsPerPacket
      const newUnitCost = packetCost > 0 ? round2(packetCost / itemsPerPacket) : null
      const defaultUnitPrice = isRedo ? currentSellingPrice : (currentSellingPrice > 0 ? round2(currentSellingPrice / itemsPerPacket) : null)
      const newUnitPrice = unitSellingPriceOverride ?? defaultUnitPrice ?? 0

      await tx.productVariants.update({
        where: { id: variant.id },
        data: { stockQuantity: newStock, price: newUnitPrice, updatedAt: new Date() },
      })
      await (tx as any).businessProducts.update({
        where: { id: rawId },
        data: {
          costPrice: newUnitCost,
          basePrice: newUnitPrice,
          unitsPerPack: itemsPerPacket,
          bulkPackCost: packetCost > 0 ? packetCost : null,
          isBulkStock: true,
          bulkConvertedAt: new Date(),
          updatedAt: new Date(),
        },
      })

      await tx.businessStockMovements.create({
        data: {
          businessId,
          businessProductId: rawId,
          productVariantId: variant.id,
          businessType: currentProduct.businessType,
          movementType: 'ADJUSTMENT',
          quantity: newStock - currentStock,
          reason: isRedo
            ? `Bulk conversion corrected: ${packetQty} packet(s) → ${newStock} unit(s) @ ${itemsPerPacket}/pack (was ${oldUnitsPerPack}/pack)`
            : `Bulk conversion: ${currentStock} packet(s) → ${newStock} unit(s) @ ${itemsPerPacket}/pack`,
        },
      })

      // Sync back to the warehouse side — a batch item's manifestQty is a
      // packet count when this product is bulk; any warehouse item(s) that
      // resolved to this product (whether converted right at Move time or
      // only just now, here) need the same conversion factor recorded so
      // batch-level totals (Move Sessions, Potential Value) stay correct.
      await tx.warehouseItems.updateMany({
        where: { businessProductId: rawId },
        data: { itemsPerPacket },
      })

      return { currentStock, currentCostPrice, currentSellingPrice, newStock, newUnitCost, newUnitPrice, name: currentProduct.name }
    })

    await Promise.all([
      result.newUnitCost != null
        ? recordPriceChangeIfDifferent({
            businessId, catalogSource: 'BUSINESS_PRODUCT', productRefId: rawId, priceType: 'COST',
            oldPrice: result.currentCostPrice || null, newPrice: result.newUnitCost,
            changedBy: user.id, changeReason: 'BULK_STOCK_CONVERSION', productName: result.name, changedByName: user.name,
          })
        : Promise.resolve(),
      recordPriceChangeIfDifferent({
        businessId, catalogSource: 'BUSINESS_PRODUCT', productRefId: rawId, priceType: 'SELLING',
        oldPrice: result.currentSellingPrice || null, newPrice: result.newUnitPrice,
        changedBy: user.id, changeReason: 'BULK_STOCK_CONVERSION', productName: result.name, changedByName: user.name,
      }),
      createAuditLog({
        userId: user.id,
        action: 'PRODUCT_BULK_STOCK_CONVERTED',
        entityType: 'Product',
        entityId: rawId,
        oldValues: { stockQuantity: result.currentStock, costPrice: result.currentCostPrice, sellingPrice: result.currentSellingPrice },
        newValues: { stockQuantity: result.newStock, costPrice: result.newUnitCost, sellingPrice: result.newUnitPrice, itemsPerPacket },
        metadata: { sourceTable: 'BUSINESS_PRODUCT', businessId, productName: result.name, redo: isRedo },
        businessId,
      }),
    ])

    return NextResponse.json({ success: true, stockQuantity: result.newStock, costPrice: result.newUnitCost, sellingPrice: result.newUnitPrice, redo: isRedo })
  } catch (error) {
    console.error('[bulk-stock-conversion POST]', error)
    return NextResponse.json({ error: 'Failed to convert item' }, { status: 500 })
  }
}
