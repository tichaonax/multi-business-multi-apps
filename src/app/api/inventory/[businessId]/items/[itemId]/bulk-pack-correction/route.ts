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
 * report's Bulk Cost Allocation Issue flag. Deliberately narrow and safe by
 * construction: the ONLY thing this endpoint ever accepts is `unitsPerPack`
 * — it never accepts a cost value from the caller, so someone with report
 * access but no inventory-edit permission can use it without ever being
 * able to change a price. When the item already has a `bulkPackCost` on
 * file (set previously by someone with inventory-edit permission via the
 * full item editor), correcting the pack size also recalculates the derived
 * per-unit cost from that already-authorized number. When no bulk cost is
 * on file, this only records the pack size — cost price is left untouched,
 * since establishing a bulk cost requires the full item editor.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; itemId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, itemId } = await params
    // Anyone who can view this report may correct the pack quantity — it's a
    // safe, non-financial correction. Only the full item editor (a separate
    // route) can actually change a cost value, and that stays gated to
    // canManageInventory there.
    const canCorrectQuantity = isSystemAdmin(user)
      || hasPermission(user, 'canManageInventory', businessId)
      || hasPermission(user, 'canAccessFinancialData', businessId)
    if (!canCorrectQuantity) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
      const oldCostPrice = existing.costPrice ? parseFloat(existing.costPrice.toString()) : null
      const correctedUnitCost = bulkPackCost !== null && bulkPackCost > 0
        ? Math.round((bulkPackCost / unitsPerPack) * 100) / 100
        : null

      await prisma.barcodeInventoryItems.update({
        where: { id: rawId },
        data: {
          unitsPerPack,
          ...(correctedUnitCost !== null ? { costPrice: correctedUnitCost } : {}),
          updatedAt: new Date(),
        },
      })

      await Promise.all([
        correctedUnitCost !== null
          ? recordPriceChangeIfDifferent({
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
            })
          : Promise.resolve(),
        createAuditLog({
          userId: user.id,
          action: 'PRODUCT_BULK_PACK_CORRECTED',
          entityType: 'Product',
          entityId: rawId,
          oldValues: { unitsPerPack: existing.unitsPerPack, costPrice: oldCostPrice },
          newValues: { unitsPerPack, costPrice: correctedUnitCost ?? oldCostPrice },
          metadata: { sourceTable: 'BARCODE_ITEM', businessId, productName: existing.name, bulkPackCost, source: 'Pricing, Cost & Value Exceptions Report' },
          businessId,
        }),
      ])

      return NextResponse.json({ success: true, unitsPerPack, costPrice: correctedUnitCost ?? oldCostPrice })
    }

    const existing = await prisma.businessProducts.findFirst({ where: { id: rawId, businessId } })
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const bulkPackCost = existing.bulkPackCost ? parseFloat(existing.bulkPackCost.toString()) : null
    const oldCostPrice = existing.costPrice ? parseFloat(existing.costPrice.toString()) : null
    const correctedUnitCost = bulkPackCost !== null && bulkPackCost > 0
      ? Math.round((bulkPackCost / unitsPerPack) * 100) / 100
      : null

    await prisma.businessProducts.update({
      where: { id: rawId },
      data: {
        unitsPerPack,
        ...(correctedUnitCost !== null ? { costPrice: correctedUnitCost } : {}),
        updatedAt: new Date(),
      },
    })

    await Promise.all([
      correctedUnitCost !== null
        ? recordPriceChangeIfDifferent({
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
          })
        : Promise.resolve(),
      createAuditLog({
        userId: user.id,
        action: 'PRODUCT_BULK_PACK_CORRECTED',
        entityType: 'Product',
        entityId: rawId,
        oldValues: { unitsPerPack: existing.unitsPerPack, costPrice: oldCostPrice },
        newValues: { unitsPerPack, costPrice: correctedUnitCost ?? oldCostPrice },
        metadata: { sourceTable: 'BUSINESS_PRODUCT', businessId, productName: existing.name, bulkPackCost, source: 'Pricing, Cost & Value Exceptions Report' },
        businessId,
      }),
    ])

    return NextResponse.json({ success: true, unitsPerPack, costPrice: correctedUnitCost ?? oldCostPrice })
  } catch (error) {
    console.error('[bulk-pack-correction POST]', error)
    return NextResponse.json({ error: 'Failed to save correction' }, { status: 500 })
  }
}
