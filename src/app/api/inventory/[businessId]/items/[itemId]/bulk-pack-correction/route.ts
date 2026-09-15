import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import { createAuditLog } from '@/lib/audit'
import { recordPriceChangeIfDifferent } from '@/lib/inventory/price-history'

/**
 * POST /api/inventory/[businessId]/items/[itemId]/bulk-pack-correction
 *
 * MBM-297 — the quick "Fix" action from the Pricing, Cost & Value Exceptions
 * report's Bulk Cost Allocation Issue flag. Deliberately narrow: the ONLY
 * thing this endpoint accepts is a corrected `unitsPerPack` for a product
 * that already has a `bulkPackCost` on file — it never accepts or guesses a
 * bulk cost, selling price, or stock balance change. A product with no bulk
 * cost on file at all must go through the full item editor instead (see
 * `UniversalInventoryForm`'s bulk-pack fields), since establishing one may
 * require the cost price to be corrected too, which this endpoint won't do.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; itemId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, itemId } = await params
    const canEdit = isSystemAdmin(user) || hasPermission(user, 'canManageInventory', businessId)
    if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const unitsPerPack = parseInt(body.unitsPerPack, 10)
    if (!Number.isFinite(unitsPerPack) || unitsPerPack <= 0) {
      return NextResponse.json({ error: 'Units per pack must be a positive whole number' }, { status: 400 })
    }

    const isBarcodeItem = itemId.startsWith('inv_')
    const rawId = isBarcodeItem ? itemId.replace(/^inv_/, '') : itemId

    if (isBarcodeItem) {
      const existing = await prisma.barcodeInventoryItems.findFirst({ where: { id: rawId, businessId } })
      if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

      const bulkPackCost = existing.bulkPackCost ? parseFloat(existing.bulkPackCost.toString()) : null
      if (bulkPackCost === null || bulkPackCost <= 0) {
        return NextResponse.json({ error: 'No bulk-pack cost is on file for this item — use the full item editor to set one up first' }, { status: 400 })
      }

      const oldCostPrice = existing.costPrice ? parseFloat(existing.costPrice.toString()) : null
      const correctedUnitCost = Math.round((bulkPackCost / unitsPerPack) * 100) / 100

      await prisma.barcodeInventoryItems.update({
        where: { id: rawId },
        data: { unitsPerPack, costPrice: correctedUnitCost, updatedAt: new Date() },
      })

      await Promise.all([
        recordPriceChangeIfDifferent({
          businessId,
          catalogSource: 'BARCODE_ITEM',
          productRefId: rawId,
          priceType: 'COST',
          oldPrice: oldCostPrice,
          newPrice: correctedUnitCost,
          changedBy: user.id,
          changeReason: 'BULK_PACK_CORRECTION',
          productName: existing.name,
          changedByName: user.name,
        }),
        createAuditLog({
          userId: user.id,
          action: 'PRODUCT_BULK_PACK_CORRECTED',
          entityType: 'Product',
          entityId: rawId,
          oldValues: { unitsPerPack: existing.unitsPerPack, costPrice: oldCostPrice },
          newValues: { unitsPerPack, costPrice: correctedUnitCost },
          metadata: { sourceTable: 'BARCODE_ITEM', businessId, productName: existing.name, bulkPackCost, source: 'Pricing, Cost & Value Exceptions Report' },
          businessId,
        }),
      ])

      return NextResponse.json({ success: true, unitsPerPack, costPrice: correctedUnitCost })
    }

    const existing = await prisma.businessProducts.findFirst({ where: { id: rawId, businessId } })
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const bulkPackCost = existing.bulkPackCost ? parseFloat(existing.bulkPackCost.toString()) : null
    if (bulkPackCost === null || bulkPackCost <= 0) {
      return NextResponse.json({ error: 'No bulk-pack cost is on file for this product — use the full item editor to set one up first' }, { status: 400 })
    }

    const oldCostPrice = existing.costPrice ? parseFloat(existing.costPrice.toString()) : null
    const correctedUnitCost = Math.round((bulkPackCost / unitsPerPack) * 100) / 100

    await prisma.businessProducts.update({
      where: { id: rawId },
      data: { unitsPerPack, costPrice: correctedUnitCost, updatedAt: new Date() },
    })

    await Promise.all([
      recordPriceChangeIfDifferent({
        businessId,
        catalogSource: 'BUSINESS_PRODUCT',
        productRefId: rawId,
        priceType: 'COST',
        oldPrice: oldCostPrice,
        newPrice: correctedUnitCost,
        changedBy: user.id,
        changeReason: 'BULK_PACK_CORRECTION',
        productName: existing.name,
        changedByName: user.name,
      }),
      createAuditLog({
        userId: user.id,
        action: 'PRODUCT_BULK_PACK_CORRECTED',
        entityType: 'Product',
        entityId: rawId,
        oldValues: { unitsPerPack: existing.unitsPerPack, costPrice: oldCostPrice },
        newValues: { unitsPerPack, costPrice: correctedUnitCost },
        metadata: { sourceTable: 'BUSINESS_PRODUCT', businessId, productName: existing.name, bulkPackCost, source: 'Pricing, Cost & Value Exceptions Report' },
        businessId,
      }),
    ])

    return NextResponse.json({ success: true, unitsPerPack, costPrice: correctedUnitCost })
  } catch (error) {
    console.error('[bulk-pack-correction POST]', error)
    return NextResponse.json({ error: 'Failed to save correction' }, { status: 500 })
  }
}
