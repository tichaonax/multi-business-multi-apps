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
 * report's Bulk Cost Allocation Issue flag. Always requires an explicit
 * `unitsPerPack`. `bulkPackCost` is optional: when the item already has one
 * on file, it's reused as-is (the endpoint never overwrites a recorded bulk
 * cost by itself); when none is on file yet, the caller must supply the real
 * case/pack cost here — this endpoint never guesses one from the existing
 * per-unit `costPrice`. Either way the persisted per-unit cost is always the
 * computed `bulkPackCost ÷ unitsPerPack`, never a raw guess.
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
    const suppliedBulkPackCost = body.bulkPackCost !== undefined && body.bulkPackCost !== null && body.bulkPackCost !== ''
      ? parseFloat(body.bulkPackCost)
      : null
    if (body.bulkPackCost !== undefined && body.bulkPackCost !== null && body.bulkPackCost !== '' && (!Number.isFinite(suppliedBulkPackCost) || (suppliedBulkPackCost as number) <= 0)) {
      return NextResponse.json({ error: 'Case/pack cost must be a positive number' }, { status: 400 })
    }

    const isBarcodeItem = itemId.startsWith('inv_')
    const rawId = isBarcodeItem ? itemId.replace(/^inv_/, '') : itemId

    if (isBarcodeItem) {
      const existing = await prisma.barcodeInventoryItems.findFirst({ where: { id: rawId, businessId } })
      if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

      const existingBulkPackCost = existing.bulkPackCost ? parseFloat(existing.bulkPackCost.toString()) : null
      const bulkPackCost = existingBulkPackCost ?? suppliedBulkPackCost
      if (bulkPackCost === null || bulkPackCost <= 0) {
        return NextResponse.json({ error: 'A case/pack cost is required to calculate the unit cost' }, { status: 400 })
      }

      const oldCostPrice = existing.costPrice ? parseFloat(existing.costPrice.toString()) : null
      const correctedUnitCost = Math.round((bulkPackCost / unitsPerPack) * 100) / 100

      await prisma.barcodeInventoryItems.update({
        where: { id: rawId },
        data: { unitsPerPack, bulkPackCost, costPrice: correctedUnitCost, updatedAt: new Date() },
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

    const existingBulkPackCost = existing.bulkPackCost ? parseFloat(existing.bulkPackCost.toString()) : null
    const bulkPackCost = existingBulkPackCost ?? suppliedBulkPackCost
    if (bulkPackCost === null || bulkPackCost <= 0) {
      return NextResponse.json({ error: 'A case/pack cost is required to calculate the unit cost' }, { status: 400 })
    }

    const oldCostPrice = existing.costPrice ? parseFloat(existing.costPrice.toString()) : null
    const correctedUnitCost = Math.round((bulkPackCost / unitsPerPack) * 100) / 100

    await prisma.businessProducts.update({
      where: { id: rawId },
      data: { unitsPerPack, bulkPackCost, costPrice: correctedUnitCost, updatedAt: new Date() },
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
