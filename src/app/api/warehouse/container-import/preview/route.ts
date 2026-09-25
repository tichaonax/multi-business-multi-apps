import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { parseContainerBatchXlsx } from '@/lib/warehouse/container-batch-parser'

/**
 * POST /api/warehouse/container-import/preview
 *
 * MBM-300 — Step 1 of the Container Batch import. Parses the uploaded
 * "Container Batch" .xlsx (post-clearance economics: unit/clearance/shipping
 * cost, landed cost, est. selling price, tracking#/order# reconciliation)
 * and returns a full preview — matched against existing IN_WAREHOUSE items
 * by order #, plus a possible-duplicate flag for items already reconciled by
 * an earlier container import. Writes nothing to the database; the file
 * itself is re-submitted to /commit afterwards so the server always parses
 * authoritatively from the real bytes rather than trusting client totals.
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
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

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

    const lineItems = parsed.rows.filter(r => r.isLineItem)

    // Match each line item against an existing item by order # — the stable
    // buyer-side reference across supply-chain stages (tracking # can differ
    // between the early domestic-courier leg and the later international-
    // freight leg for the same order). Matches items still IN_WAREHOUSE
    // (normal reconcile-and-update) AND items already MOVED_TO_BUSINESS —
    // re-importing a corrected file must never silently create a duplicate
    // product for an order that's already live; instead it offers to refresh
    // that product's pricing only (SKU/barcode already assigned stay put).
    const orderNumbers = [...new Set(lineItems.map(r => r.orderNumber).filter(Boolean))] as string[]
    const existingItems = orderNumbers.length > 0
      ? await (prisma as any).warehouseItems.findMany({
          where: { orderNumber: { in: orderNumbers }, status: { in: ['IN_WAREHOUSE', 'MOVED_TO_BUSINESS'] } },
          select: {
            id: true, orderNumber: true, landedCost: true, sourceBatchName: true, productName: true,
            status: true, businessProductId: true,
          },
        })
      : []
    const byOrderNumber = new Map<string, typeof existingItems[0]>()
    for (const it of existingItems) byOrderNumber.set(it.orderNumber, it)

    const movedProductIds = [...new Set(existingItems.filter((i: any) => i.status === 'MOVED_TO_BUSINESS' && i.businessProductId).map((i: any) => i.businessProductId))] as string[]
    const linkedProducts = movedProductIds.length > 0
      ? await (prisma as any).businessProducts.findMany({
          where: { id: { in: movedProductIds } },
          select: { id: true, basePrice: true, costPrice: true, sku: true, barcode: true },
        })
      : []
    const linkedProductMap = new Map(linkedProducts.map((p: any) => [p.id, p]))

    const previewRows = parsed.rows.map(r => {
      const img = parsed.imagesByRow.get(r.rowIndex)
      const matched = r.orderNumber ? byOrderNumber.get(r.orderNumber) : undefined
      const isMovedMatch = matched?.status === 'MOVED_TO_BUSINESS'
      const linkedProduct: any = isMovedMatch && matched?.businessProductId ? linkedProductMap.get(matched.businessProductId) : null
      return {
        ...r,
        imageDataUrl: img ? `data:${img.mimeType};base64,${img.data.toString('base64')}` : null,
        matchedWarehouseItemId: matched?.id ?? null,
        matchedProductName: matched?.productName ?? null,
        alreadyReconciled: !!matched && !isMovedMatch && matched.landedCost != null,
        alreadyReconciledInBatch: !isMovedMatch && matched?.landedCost != null ? matched.sourceBatchName : null,
        // Already live in a business — reimporting must only refresh pricing,
        // never create a duplicate or touch the assigned SKU/barcode.
        alreadyMovedToBusiness: isMovedMatch,
        currentLiveSku: linkedProduct?.sku ?? null,
        currentLiveBarcode: linkedProduct?.barcode ?? null,
        currentLivePrice: linkedProduct?.basePrice != null ? Number(linkedProduct.basePrice) : null,
      }
    })

    const suggestedBatchName = parsed.sourceBatchTitle
      ? parsed.sourceBatchTitle.replace(/^Container Batch\s*[—-]\s*/i, '').trim() || parsed.sourceBatchTitle
      : file.name.replace(/\.xlsx?$/i, '')

    return NextResponse.json({
      success: true,
      fileHash,
      sourceBatchTitle: parsed.sourceBatchTitle,
      suggestedBatchName,
      batchStatus: parsed.batchStatus,
      headerItemCount: parsed.headerItemCount,
      exchangeRateText: parsed.exchangeRateText,
      exchangeRateYuanPerUsd: parsed.exchangeRateYuanPerUsd,
      generatedAt: parsed.generatedAt,
      totalLandedCost: parsed.totalLandedCost,
      totalProjectedSelling: parsed.totalProjectedSelling,
      totalProjectedProfit: parsed.totalProjectedProfit,
      profitMarginPct: parsed.profitMarginPct,
      totalRowsInFile: parsed.totalRowsInFile,
      lineItemCount: lineItems.length,
      matchedCount: previewRows.filter(r => r.matchedWarehouseItemId).length,
      duplicateCount: previewRows.filter(r => r.alreadyReconciled).length,
      movedToBusinessCount: previewRows.filter(r => r.alreadyMovedToBusiness).length,
      rows: previewRows,
    })
  } catch (error: any) {
    console.error('POST /api/warehouse/container-import/preview error:', error)
    return NextResponse.json({ error: error.message || 'Preview failed' }, { status: 500 })
  }
}
