import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { parseContainerBatchXlsx } from '@/lib/warehouse/container-batch-parser'

/**
 * POST /api/warehouse/container-import/commit
 *
 * MBM-300 — Step 2 (final) of the Container Batch import. Re-parses the same
 * file from scratch (never trusts client-side totals/selections beyond which
 * row indexes to include) and, for each included real line item:
 *   - if an IN_WAREHOUSE item with the same order # already exists (from the
 *     earlier Yuan-stage warehouse import), UPDATES it with this file's
 *     post-clearance economics and sets manifestQty from `Ordered` — the
 *     real per-unit quantity, per the user's explicit decision (not the
 *     clearing agent's box-count `Batch Qty`). This is what satisfies the
 *     existing /api/warehouse/[batchId]/move endpoint's "Manifest Qty
 *     required" gate, so reconciled items become movable immediately.
 *   - otherwise CREATES a new IN_WAREHOUSE item under a freshly-created
 *     WarehouseBatches row representing this import.
 * A brand-new WarehouseBatches row is always created (named + file-hash
 * de-duplicated, matching the existing convention) so this import shows up
 * as its own entry in the Warehouse list, even when most of its rows just
 * updated pre-existing items.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const batchName = (formData.get('batchName') as string | null)?.trim()
    const includedRowIndexesRaw = formData.get('includedRowIndexes') as string | null
    const sellingPriceOverridesRaw = formData.get('sellingPriceOverrides') as string | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!batchName) return NextResponse.json({ error: 'Batch name is required' }, { status: 400 })
    if (!includedRowIndexesRaw) return NextResponse.json({ error: 'includedRowIndexes is required' }, { status: 400 })

    let includedRowIndexes: number[]
    try {
      includedRowIndexes = JSON.parse(includedRowIndexesRaw)
      if (!Array.isArray(includedRowIndexes)) throw new Error()
    } catch {
      return NextResponse.json({ error: 'includedRowIndexes must be a JSON array of row indexes' }, { status: 400 })
    }
    const includedSet = new Set(includedRowIndexes)

    // Per-row selling-price overrides — user changed the file's suggested
    // price on the review screen. Keyed by rowIndex, value in US$.
    let sellingPriceOverrides: Record<number, number> = {}
    if (sellingPriceOverridesRaw) {
      try { sellingPriceOverrides = JSON.parse(sellingPriceOverridesRaw) } catch {}
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')

    const existingBatch = await (prisma as any).warehouseBatches.findUnique({ where: { fileHash } })
    if (existingBatch) {
      return NextResponse.json({
        error: 'This exact file was already imported',
        existingBatch: { id: existingBatch.id, batchName: existingBatch.batchName, importedAt: existingBatch.importedAt },
      }, { status: 409 })
    }

    let parsed
    try {
      parsed = await parseContainerBatchXlsx(buffer)
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Could not parse this file as a Container Batch export' }, { status: 400 })
    }

    const includedLineItems = parsed.rows.filter(r => r.isLineItem && includedSet.has(r.rowIndex))
    if (includedLineItems.length === 0) {
      return NextResponse.json({ error: 'No items selected to import' }, { status: 400 })
    }

    // Re-match fresh, server-side — never trust the client's preview snapshot.
    const orderNumbers = [...new Set(includedLineItems.map(r => r.orderNumber).filter(Boolean))] as string[]
    const existingItems = orderNumbers.length > 0
      ? await (prisma as any).warehouseItems.findMany({
          where: { orderNumber: { in: orderNumbers }, status: 'IN_WAREHOUSE' },
          select: { id: true, orderNumber: true, trackingNumber: true, imageId: true },
        })
      : []
    const byOrderNumber = new Map<string, typeof existingItems[0]>()
    for (const it of existingItems) byOrderNumber.set(it.orderNumber, it)

    const totalLandedCost = includedLineItems.reduce((s, r) => s + (r.landedCost ?? 0) * (r.orderedQty ?? 0), 0)
    const totalSelling = includedLineItems.reduce((s, r) => {
      const price = sellingPriceOverrides[r.rowIndex] ?? r.estSellingPrice ?? 0
      return s + price * (r.orderedQty ?? 0)
    }, 0)

    const batch = await (prisma as any).warehouseBatches.create({
      data: {
        batchName,
        batchNumber: null,
        importedBy: user.id,
        status: 'ACTIVE',
        rowCount: includedLineItems.length,
        totalUsdCost: totalLandedCost,
        fileHash,
        originalFileName: file.name,
        notes: `Container Batch import — ${includedLineItems.length} of ${parsed.rows.filter(r => r.isLineItem).length} costed line items included, projected selling $${totalSelling.toFixed(2)}`,
        exchangeRate: parsed.exchangeRateYuanPerUsd,
        totalLandedCost: parsed.totalLandedCost,
        totalProjectedSelling: parsed.totalProjectedSelling,
        totalProjectedProfit: parsed.totalProjectedProfit,
        profitMarginPct: parsed.profitMarginPct,
      },
    })

    let createdCount = 0
    let updatedCount = 0
    const containerDate = new Date()

    for (const row of includedLineItems) {
      if (!row.orderNumber) continue // schema requires orderNumber — a line item without one can't be persisted

      let imageId: string | null = null
      const imgData = parsed.imagesByRow.get(row.rowIndex)
      if (imgData) {
        const imgRecord = await (prisma as any).images.create({
          data: { data: imgData.data, mimeType: imgData.mimeType, size: imgData.data.length },
        })
        imageId = imgRecord.id
      }

      const matched = byOrderNumber.get(row.orderNumber)

      // Apply a user override from the review screen, if any — recompute the
      // margin % against this row's own landed cost so it stays accurate.
      const override = sellingPriceOverrides[row.rowIndex]
      let effectiveSellingPrice = row.estSellingPrice
      let effectiveMarginPct = row.estMarginPct
      if (override != null && !isNaN(override)) {
        effectiveSellingPrice = override
        effectiveMarginPct = row.landedCost && row.landedCost > 0
          ? `${override >= row.landedCost ? '+' : ''}${(((override - row.landedCost) / row.landedCost) * 100).toFixed(1)}%`
          : row.estMarginPct
      }

      if (matched) {
        await (prisma as any).warehouseItems.update({
          where: { id: matched.id },
          data: {
            trackingNumber: matched.trackingNumber ?? row.trackingNumber, // preserve an existing tracking#; only fill if it was empty
            manifestQty: row.orderedQty, // Ordered = source of truth for stock quantity
            costUsd: row.unitCost,
            exchangeRate: parsed.exchangeRateYuanPerUsd,
            clearanceCostUsd: row.clearancePerUnit,
            shippingPerUnit: row.shippingPerUnit,
            landedCost: row.landedCost,
            estSellingPrice: effectiveSellingPrice,
            estMarginPct: effectiveMarginPct,
            batchQty: row.batchQty,
            diffQty: row.diffQty,
            matchStatus: row.matchStatus,
            cbm: row.cbm,
            weightKg: row.weightKg,
            sourceBatchName: batchName,
            containerDate,
            imageId: imageId ?? matched.imageId,
          },
        })
        updatedCount++
      } else {
        await (prisma as any).warehouseItems.create({
          data: {
            batchId: batch.id,
            orderNumber: row.orderNumber,
            trackingNumber: row.trackingNumber,
            productName: row.productName,
            shortName: row.productName.slice(0, 60),
            quantity: row.orderedQty,
            manifestQty: row.orderedQty,
            costUsd: row.unitCost,
            exchangeRate: parsed.exchangeRateYuanPerUsd,
            clearanceCostUsd: row.clearancePerUnit,
            shippingPerUnit: row.shippingPerUnit,
            landedCost: row.landedCost,
            estSellingPrice: effectiveSellingPrice,
            estMarginPct: effectiveMarginPct,
            batchQty: row.batchQty,
            diffQty: row.diffQty,
            matchStatus: row.matchStatus,
            cbm: row.cbm,
            weightKg: row.weightKg,
            sourceBatchName: batchName,
            containerDate,
            imageId,
            status: 'IN_WAREHOUSE',
          },
        })
        createdCount++
      }

      // Same ON CONFLICT DO NOTHING convention as the original Yuan-stage
      // import — never overwrites an existing orderMax figure, only fills
      // in coverage for order/tracking combos not already tracked.
      await prisma.$executeRaw`
        INSERT INTO warehouse_order_refs ("orderNumber", "trackingNumber", "orderedQty")
        VALUES (${row.orderNumber}, ${row.trackingNumber ?? ''}, ${row.orderedQty ?? 0})
        ON CONFLICT ("orderNumber", "trackingNumber") DO NOTHING
      `
    }

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      batchName: batch.batchName,
      createdCount,
      updatedCount,
    })
  } catch (error: any) {
    console.error('POST /api/warehouse/container-import/commit error:', error)
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 })
  }
}
