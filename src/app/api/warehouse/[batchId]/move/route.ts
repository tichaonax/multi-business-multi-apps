import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const canMove = isAdmin || (user.permissions as any)?.canMoveWarehouseToInventory === true
    if (!canMove) return NextResponse.json({ error: 'Insufficient permissions — requires canMoveWarehouseToInventory' }, { status: 403 })

    const { batchId } = params
    const body = await req.json()

    // Required: target business, category, list of items with selling prices
    const { businessId, businessType, categoryId, items: itemMoves } = body
    // itemMoves: Array<{ itemId: string, sellingPrice: number, barcode?: string }>
    if (!businessId || !businessType || !categoryId || !Array.isArray(itemMoves) || itemMoves.length === 0) {
      return NextResponse.json({ error: 'businessId, businessType, categoryId, and items[] are required' }, { status: 400 })
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

    const movedAt = new Date()
    const results: Array<{ itemId: string; productId: string; sku: string }> = []

    for (const warehouseItem of warehouseItems) {
      const move = itemMoves.find((m: any) => m.itemId === warehouseItem.id)
      if (!move) continue

      const costUsd = warehouseItem.costUsd ? Number(warehouseItem.costUsd) : 0
      const costPrice = costUsd + perItemTransport
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
            categoryId,
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
            stockQuantity: warehouseItem.quantity || 1,
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
            quantity: warehouseItem.quantity || 1,
            unitCost: costPrice > 0 ? costPrice : null,
            reference: warehouseItem.id,
            reason: `Warehouse import — ${batch.batchName}`,
          }
        })

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
