import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/warehouse/[batchId]/recalculate-economics
 *
 * MBM-300 follow-up — brings the original Yuan-stage import workflow to the
 * same persisted economics columns a Container Batch reconciliation already
 * produces (costUsd/clearanceCostUsd normalized to PER-UNIT, plus
 * shippingPerUnit/landedCost/estSellingPrice/estMarginPct), using whatever
 * the user has already entered on this batch: per-item Cost $ / Rate
 * (via the existing editable cells), the file's own pro-rata clearance, and
 * the batch's transport/transaction-fee settings — plus a markup % supplied
 * here. Only ever recomputes items that already have a cost basis; anything
 * still missing Cost $ is skipped and reported back so the caller knows to
 * fill it in first.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { batchId } = await params
    const body = await req.json()
    const markupPct = Number(body.markupPct)
    if (isNaN(markupPct) || markupPct < 0) {
      return NextResponse.json({ error: 'markupPct must be a non-negative number' }, { status: 400 })
    }
    const itemIds: string[] | undefined = Array.isArray(body.itemIds) ? body.itemIds : undefined

    const batch = await (prisma as any).warehouseBatches.findUnique({ where: { id: batchId } })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    const inWarehouseCount = await (prisma as any).warehouseItems.count({ where: { batchId, status: 'IN_WAREHOUSE' } })
    const perItemTransport = (batch.pickedUpAtCollectionPoint && batch.collectionTransportCost && inWarehouseCount > 0)
      ? Number(batch.collectionTransportCost) / inWarehouseCount
      : 0
    const transactionFeePct = batch.transactionFeePct != null ? Number(batch.transactionFeePct) : null

    const where: any = { batchId, status: 'IN_WAREHOUSE' }
    if (itemIds) where.id = { in: itemIds }
    const candidates = await (prisma as any).warehouseItems.findMany({ where })

    let recalculatedCount = 0
    let skippedNoCost = 0

    for (const item of candidates) {
      if (item.costUsd == null) { skippedNoCost++; continue }

      const itemQty = item.quantity || 1
      // Once already recalculated (or reconciled via Container Batch),
      // costUsd/clearanceCostUsd are already per-unit — don't divide again.
      const alreadyNormalized = item.landedCost != null
      const costUsdPerUnit = alreadyNormalized ? Number(item.costUsd) : Number(item.costUsd) / itemQty
      const clearancePerUnit = item.clearanceCostUsd != null
        ? Number(item.clearanceCostUsd) / (alreadyNormalized ? 1 : itemQty)
        : 0
      const txFeePerUnit = transactionFeePct != null ? costUsdPerUnit * (transactionFeePct / 100) : 0
      const transportPerUnit = perItemTransport / itemQty
      const shippingPerUnit = txFeePerUnit + transportPerUnit
      const landedCost = costUsdPerUnit + clearancePerUnit + shippingPerUnit
      const estSellingPrice = landedCost * (1 + markupPct / 100)

      await (prisma as any).warehouseItems.update({
        where: { id: item.id },
        data: {
          costUsd: costUsdPerUnit,
          clearanceCostUsd: clearancePerUnit,
          shippingPerUnit,
          landedCost,
          estSellingPrice,
          estMarginPct: `+${markupPct}%`,
        },
      })
      recalculatedCount++
    }

    return NextResponse.json({ success: true, recalculatedCount, skippedNoCost })
  } catch (error: any) {
    console.error('POST /api/warehouse/[batchId]/recalculate-economics error:', error)
    return NextResponse.json({ error: error.message || 'Recalculation failed' }, { status: 500 })
  }
}
