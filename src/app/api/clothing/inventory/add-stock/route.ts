import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/clothing/inventory/add-stock
 *
 * Creates a BarcodeInventoryItems record for an individual product delivery.
 * Body: { businessId, templateId, name, quantity, barcode?, sku?, notes? }
 * Returns: { success, itemId }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, templateId, name, quantity, barcode, sku, notes } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!templateId) return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!quantity || Number(quantity) < 1) return NextResponse.json({ error: 'quantity must be >= 1' }, { status: 400 })

    const inventoryItemId = randomBytes(8).toString('hex')
    const barcodeData = barcode?.trim() || randomBytes(4).toString('hex')

    const item = await prisma.barcodeInventoryItems.create({
      data: {
        name: name.trim(),
        sku: sku?.trim() || undefined,
        barcodeTemplateId: templateId,
        businessId,
        inventoryItemId,
        barcodeData,
        quantity: Number(quantity),
        stockQuantity: Number(quantity),
        customLabel: notes?.trim() || undefined,
        createdById: user.id,
      },
    })

    return NextResponse.json({ success: true, itemId: item.id, inventoryItemId: item.inventoryItemId, barcodeData: item.barcodeData })
  } catch (error) {
    console.error('[add-stock POST]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add stock' },
      { status: 500 }
    )
  }
}
