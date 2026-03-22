import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/stock-take/drafts/[id]/sync
 *
 * Re-fetches the live stockQuantity for every existing-item row in the draft.
 * Updates systemQuantity on each draft item so variance can be recalculated.
 *
 * Returns: {
 *   success,
 *   syncedAt,
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

    const existingItems = draft.items
    if (existingItems.length === 0) {
      return NextResponse.json({ success: true, syncedAt: new Date(), updates: [] })
    }

    // Fetch live stock for all barcodes in one query
    const barcodes = existingItems.map(i => i.barcode).filter(Boolean) as string[]
    const liveStock = await prisma.barcodeInventoryItems.findMany({
      where: { businessId: draft.businessId, barcodeData: { in: barcodes } },
      select: { barcodeData: true, stockQuantity: true },
    })

    const liveMap = new Map(liveStock.map(s => [s.barcodeData, s.stockQuantity]))

    // Update each draft item's systemQuantity and track changes
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

    // Update lastSyncedAt on draft
    await prisma.stockTakeDrafts.update({
      where: { id },
      data: { lastSyncedAt: syncedAt },
    })

    return NextResponse.json({ success: true, syncedAt, updates })
  } catch (error) {
    console.error('[stock-take/drafts/sync POST]', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
