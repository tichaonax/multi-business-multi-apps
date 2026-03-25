import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/stock-take/drafts/[id]/sync
 *
 * Re-fetches the live stockQuantity for every existing-item row in the draft.
 * Updates systemQuantity on each draft item so variance can be recalculated.
 * Also handles:
 *   - CustomBulkProducts: updates systemQuantity from remainingCount
 *   - ClothingBales: updates systemQuantity from remainingCount; removes items
 *     whose bale has been transferred away (no longer owned by this business)
 *
 * Returns: {
 *   success,
 *   syncedAt,
 *   removedBaleCount,
 *   updates: [{ barcode, oldSystemQty, newSystemQty, changed }]
 * }
 */

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params

    const draft = await prisma.stockTakeDrafts.findUnique({
      where: { id },
      include: {
        items: {
          where: { isExistingItem: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    })

    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    if (draft.createdById !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (draft.status !== 'DRAFT') return NextResponse.json({ error: 'Draft already submitted' }, { status: 409 })

    let existingItems = draft.items
    if (existingItems.length === 0) {
      return NextResponse.json({ success: true, syncedAt: new Date(), removedBaleCount: 0, updates: [] })
    }

    const barcodes = existingItems.map(i => i.barcode).filter(Boolean) as string[]

    // 1. BarcodeInventoryItems lookup
    const liveStock = await prisma.barcodeInventoryItems.findMany({
      where: { businessId: draft.businessId, barcodeData: { in: barcodes } },
      select: { barcodeData: true, stockQuantity: true },
    })
    const liveMap = new Map<string, number>(liveStock.map(s => [s.barcodeData, s.stockQuantity]))

    // 2. CustomBulkProducts lookup for barcodes not found above
    const unmatchedBarcodes = barcodes.filter(b => !liveMap.has(b))
    if (unmatchedBarcodes.length > 0) {
      const bulkProducts = await prisma.customBulkProducts.findMany({
        where: { businessId: draft.businessId, barcode: { in: unmatchedBarcodes } },
        select: { barcode: true, remainingCount: true },
      })
      for (const bp of bulkProducts) {
        liveMap.set(bp.barcode, bp.remainingCount)
      }
    }

    // 3. ClothingBales lookup for still-unmatched barcodes
    const stillUnmatched = barcodes.filter(b => !liveMap.has(b))
    const transferredBarcodes = new Set<string>()
    if (stillUnmatched.length > 0) {
      const bales = await prisma.clothingBales.findMany({
        where: {
          OR: [
            { scanCode: { in: stillUnmatched } },
            { barcode: { in: stillUnmatched } },
          ],
        },
        select: { id: true, scanCode: true, barcode: true, remainingCount: true, businessId: true, isActive: true },
      })

      for (const bale of bales) {
        const barcodeKey = stillUnmatched.find(b => b === bale.scanCode || b === bale.barcode) ?? ''
        if (!barcodeKey) continue

        if (bale.businessId === draft.businessId && bale.isActive) {
          // Still owned by this business — sync quantity
          liveMap.set(barcodeKey, bale.remainingCount)
        } else {
          // Transferred away — remove from draft
          transferredBarcodes.add(barcodeKey)
        }
      }
    }

    // 4. Remove transferred bale items from the draft
    let removedBaleCount = 0
    if (transferredBarcodes.size > 0) {
      const result = await prisma.stockTakeDraftItems.deleteMany({
        where: { draftId: id, barcode: { in: Array.from(transferredBarcodes) } },
      })
      removedBaleCount = result.count
      existingItems = existingItems.filter(item => !transferredBarcodes.has(item.barcode ?? ''))
    }

    // 5. Update systemQuantity for remaining items
    const syncedAt = new Date()
    const updates: { barcode: string; oldSystemQty: number | null; newSystemQty: number; changed: boolean }[] = []

    await prisma.$transaction(
      existingItems.map(item => {
        const newQty = liveMap.get(item.barcode ?? '') ?? item.systemQuantity ?? 0
        const changed = newQty !== (item.systemQuantity ?? null)

        updates.push({
          barcode: item.barcode ?? '',
          oldSystemQty: item.systemQuantity,
          newSystemQty: newQty,
          changed,
        })

        return prisma.stockTakeDraftItems.update({
          where: { id: item.id },
          data: { systemQuantity: newQty },
        })
      })
    )

    // 6. Clear needsReview flags and set lastSyncedAt
    await prisma.$transaction([
      prisma.stockTakeDraftItems.updateMany({
        where: { draftId: id },
        data: { needsReview: false },
      }),
      prisma.stockTakeDrafts.update({
        where: { id },
        data: { lastSyncedAt: syncedAt },
      }),
    ])

    const syncedItemCount = updates.filter(u => u.changed).length
    return NextResponse.json({
      success: true,
      syncedAt,
      syncedItemCount,
      removedBaleCount,
      removedBarcodes: Array.from(transferredBarcodes),
      updates,
    })
  } catch (error) {
    console.error('[stock-take/drafts/sync POST]', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
