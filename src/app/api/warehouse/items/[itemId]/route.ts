import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { recalcAndAutoLock } from '@/lib/warehouse-auto-lock'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { itemId } = await params
    const body = await req.json()

    // Use raw SQL so all new columns (manifestQty, originalQty, etc.) are correctly read
    const itemRows: any[] = await prisma.$queryRaw`
      SELECT id, quantity, "manifestQty", "priceYuan", "costUsd", "exchangeRate", "shortName", notes,
             "originalQty", "originalPriceYuan", "qtyChangeReason", status,
             "orderNumber", "trackingNumber", "isPersonal", "batchId"
      FROM warehouse_items WHERE id = ${itemId} LIMIT 1
    `
    if (itemRows.length === 0) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    const item = itemRows[0]

    const updateData: any = {}
    if ('costUsd' in body) {
      const v = body.costUsd === null || body.costUsd === '' ? null : Number(body.costUsd)
      updateData.costUsd = (v === null || isNaN(v)) ? null : v
    }
    if ('exchangeRate' in body) {
      const v = body.exchangeRate === null || body.exchangeRate === '' ? null : Number(body.exchangeRate)
      updateData.exchangeRate = (v === null || isNaN(v)) ? null : v
    }
    if ('shortName' in body) {
      updateData.shortName = typeof body.shortName === 'string' ? body.shortName.trim().slice(0, 100) : null
    }
    if ('notes' in body) {
      updateData.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
    }

    // Manifest Qty change — quantity is now read-only (ordered qty); manifestQty is the editable received qty
    let manifestRawUpdate: {
      manifestQty: number
      originalQty: number | null       // original manifestQty before first edit (frozen)
      originalPriceYuan: number | null // original priceYuan before first edit (frozen)
      priceYuan: number | null         // recalculated: (origPriceYuan / orderedQty) × newManifestQty
      qtyChangeReason: string | null
    } | null = null

    if ('manifestQty' in body) {
      const v = body.manifestQty === null || body.manifestQty === '' ? null : parseInt(String(body.manifestQty), 10)
      const newManifestQty = v === null || isNaN(v) || v < 0 ? null : v
      if (newManifestQty === null) {
        return NextResponse.json({ error: 'Manifest Qty must be a non-negative integer' }, { status: 400 })
      }

      // Fetch orderedQty cap from warehouse_order_refs for this (orderNumber, trackingNumber)
      const tracking = item.trackingNumber ?? ''
      const refRows: any[] = await prisma.$queryRaw`
        SELECT "orderedQty" FROM warehouse_order_refs
        WHERE "orderNumber" = ${item.orderNumber} AND "trackingNumber" = ${tracking}
        LIMIT 1
      `
      const orderedQty = refRows.length > 0 ? Number(refRows[0].orderedQty) : null

      if (orderedQty !== null && newManifestQty > orderedQty) {
        return NextResponse.json({
          error: `Manifest Qty cannot exceed the ordered quantity of ${orderedQty} for this tracking`
        }, { status: 400 })
      }

      // Capture originals on first manifestQty edit only (originalQty stores the pre-edit manifestQty)
      const captureOriginalQty = item.originalQty == null
        ? (item.manifestQty != null ? Number(item.manifestQty) : 0)
        : Number(item.originalQty)

      const captureOriginalPriceYuan = item.originalPriceYuan == null
        ? (item.priceYuan != null ? Number(item.priceYuan) : null)
        : Number(item.originalPriceYuan)

      // Recompute priceYuan: unit price = originalPriceYuan / orderedQty (from quantity column)
      const orderedQtyForCalc = item.quantity != null ? Number(item.quantity) : null
      let newPriceYuan: number | null = null
      if (captureOriginalPriceYuan != null && orderedQtyForCalc != null && orderedQtyForCalc > 0) {
        newPriceYuan = (captureOriginalPriceYuan / orderedQtyForCalc) * newManifestQty
      }

      const reason = typeof body.qtyChangeReason === 'string' ? body.qtyChangeReason.trim() || null : null

      manifestRawUpdate = {
        manifestQty: newManifestQty,
        originalQty: captureOriginalQty,
        originalPriceYuan: captureOriginalPriceYuan,
        priceYuan: newPriceYuan,
        qtyChangeReason: reason,
      }
    }

    if (Object.keys(updateData).length === 0 && !manifestRawUpdate) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const now = new Date()

    // Update known Prisma columns (costUsd, exchangeRate, shortName, notes)
    if (Object.keys(updateData).length > 0) {
      await (prisma as any).warehouseItems.update({
        where: { id: itemId },
        data: { ...updateData, updatedAt: now },
      })
    }

    // Update manifest qty and related columns via raw SQL
    if (manifestRawUpdate) {
      await prisma.$executeRaw`
        UPDATE warehouse_items
        SET "manifestQty"       = ${manifestRawUpdate.manifestQty},
            "originalQty"       = ${manifestRawUpdate.originalQty},
            "originalPriceYuan" = ${manifestRawUpdate.originalPriceYuan},
            "priceYuan"         = ${manifestRawUpdate.priceYuan},
            "qtyChangeReason"   = ${manifestRawUpdate.qtyChangeReason},
            "updatedAt"         = ${now}
        WHERE id = ${itemId}
      `
    } else if (Object.keys(updateData).length > 0) {
      await prisma.$executeRaw`UPDATE warehouse_items SET "updatedAt" = ${now} WHERE id = ${itemId}`
    }

    // Return refreshed item with all columns
    const rows: any[] = await prisma.$queryRaw`
      SELECT id, quantity, "manifestQty", "priceYuan", "costUsd", "exchangeRate", "shortName", notes,
             "originalQty", "originalPriceYuan", "qtyChangeReason", "updatedAt", status,
             "orderNumber", "trackingNumber"
      FROM warehouse_items WHERE id = ${itemId} LIMIT 1
    `
    const refreshed = rows[0] ?? null

    // Re-evaluate auto-lock if a moved item's manifest qty changed
    if (manifestRawUpdate && item.status === 'MOVED_TO_BUSINESS') {
      await recalcAndAutoLock(
        prisma as any,
        [item.orderNumber],
        item.trackingNumber ? [item.trackingNumber] : [],
      )
    }

    return NextResponse.json({ success: true, item: refreshed })
  } catch (error: any) {
    console.error('PATCH /api/warehouse/items/[itemId] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
