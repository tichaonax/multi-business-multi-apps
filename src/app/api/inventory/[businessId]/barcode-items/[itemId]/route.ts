import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * PATCH /api/inventory/[businessId]/barcode-items/[itemId]
 * Update reorderLevel (and optionally other fields) on a barcode inventory item.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; itemId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, itemId } = await params
    const body = await request.json()
    const { reorderLevel } = body

    if (reorderLevel === undefined || reorderLevel === null) {
      return NextResponse.json({ error: 'reorderLevel is required' }, { status: 400 })
    }

    const parsed = parseInt(reorderLevel, 10)
    if (isNaN(parsed) || parsed < 0) {
      return NextResponse.json({ error: 'reorderLevel must be a non-negative integer' }, { status: 400 })
    }

    // Try barcode inventory item first, then fall back to product variant
    const barcodeItem = await prisma.barcodeInventoryItems.findFirst({
      where: { id: itemId, businessId },
    })

    if (barcodeItem) {
      const updated = await prisma.barcodeInventoryItems.update({
        where: { id: itemId },
        data: { reorderLevel: parsed },
        select: { id: true, reorderLevel: true },
      })
      return NextResponse.json({ success: true, id: updated.id, reorderLevel: updated.reorderLevel })
    }

    // Fall back to product variant (used by clothing, hardware, retail, etc.)
    const variant = await prisma.productVariants.findFirst({
      where: { id: itemId, business_products: { businessId } },
    })
    if (!variant) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const updated = await prisma.productVariants.update({
      where: { id: itemId },
      data: { reorderLevel: parsed },
      select: { id: true, reorderLevel: true },
    })
    return NextResponse.json({ success: true, id: updated.id, reorderLevel: updated.reorderLevel })
  } catch (error) {
    console.error('Error updating barcode item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
