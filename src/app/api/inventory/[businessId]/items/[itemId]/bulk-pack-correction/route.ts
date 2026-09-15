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
 * construction: the ONLY thing this endpoint ever accepts from the caller
 * is `unitsPerPack` — never a cost value, so nobody can inject an arbitrary
 * price through it. What it does with that number depends on who's asking:
 *
 * - When the item already has a `bulkPackCost` on file (set previously via
 *   the full item editor), anyone who can view this report may correct the
 *   pack size, and the derived per-unit cost is recalculated from that
 *   already-authorized number — no new financial fact is being asserted.
 * - When no bulk cost is on file yet and the caller has inventory-edit
 *   permission (`canManageInventory`), the report's own flag already means
 *   the recorded cost is suspected of actually being the case cost — this
 *   is exactly what that user could just as well do via the full editor by
 *   copying the same number across, so it's inferred here as a convenience:
 *   the existing cost price is treated as `bulkPackCost`, and the unit cost
 *   is corrected from it. This is the only path that establishes a bulk
 *   cost from scratch, and it never runs without that permission.
 * - When no bulk cost is on file and the caller only has report access,
 *   this only records the pack size — cost price is left untouched, since
 *   inferring a cost is itself a financial decision that permission tier
 *   isn't allowed to make.
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
    const canEditInventory = isSystemAdmin(user) || hasPermission(user, 'canManageInventory', businessId)
    const canCorrectQuantity = canEditInventory || hasPermission(user, 'canAccessFinancialData', businessId)
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

      const oldCostPrice = existing.costPrice ? parseFloat(existing.costPrice.toString()) : null
      const existingBulkPackCost = existing.bulkPackCost ? parseFloat(existing.bulkPackCost.toString()) : null
      // Infer the bulk cost from the current (suspected-wrong) cost price
      // only when this user is allowed to establish one from scratch.
      const inferredBulkPackCost = existingBulkPackCost === null && canEditInventory && oldCostPrice !== null && oldCostPrice > 0
        ? oldCostPrice
        : null
      const bulkPackCost = existingBulkPackCost ?? inferredBulkPackCost
      const correctedUnitCost = bulkPackCost !== null && bulkPackCost > 0
        ? Math.round((bulkPackCost / unitsPerPack) * 100) / 100
        : null

      await prisma.barcodeInventoryItems.update({
        where: { id: rawId },
        data: {
          unitsPerPack,
          ...(inferredBulkPackCost !== null ? { bulkPackCost: inferredBulkPackCost } : {}),
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

      return NextResponse.json({ success: true, unitsPerPack, costPrice: correctedUnitCost ?? oldCostPrice, bulkPackCost })
    }

    const existing = await prisma.businessProducts.findFirst({ where: { id: rawId, businessId } })
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const oldCostPrice = existing.costPrice ? parseFloat(existing.costPrice.toString()) : null
    const existingBulkPackCost = existing.bulkPackCost ? parseFloat(existing.bulkPackCost.toString()) : null
    const inferredBulkPackCost = existingBulkPackCost === null && canEditInventory && oldCostPrice !== null && oldCostPrice > 0
      ? oldCostPrice
      : null
    const bulkPackCost = existingBulkPackCost ?? inferredBulkPackCost
    const correctedUnitCost = bulkPackCost !== null && bulkPackCost > 0
      ? Math.round((bulkPackCost / unitsPerPack) * 100) / 100
      : null

    await prisma.businessProducts.update({
      where: { id: rawId },
      data: {
        unitsPerPack,
        ...(inferredBulkPackCost !== null ? { bulkPackCost: inferredBulkPackCost } : {}),
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

    return NextResponse.json({ success: true, unitsPerPack, costPrice: correctedUnitCost ?? oldCostPrice, bulkPackCost })
  } catch (error) {
    console.error('[bulk-pack-correction POST]', error)
    return NextResponse.json({ error: 'Failed to save correction' }, { status: 500 })
  }
}
