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
    const { businessId, templateId, name, quantity, barcode, sku, notes, description, costPrice, sellingPrice, categoryId, supplierId } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!quantity || Number(quantity) < 1) return NextResponse.json({ error: 'quantity must be >= 1' }, { status: 400 })
    if (sellingPrice === undefined || sellingPrice === null || sellingPrice === '') return NextResponse.json({ error: 'Selling price is required' }, { status: 400 })
    if (Number(sellingPrice) < 0) return NextResponse.json({ error: 'Selling price cannot be negative' }, { status: 400 })

    const inventoryItemId = randomBytes(8).toString('hex')
    const barcodeData = barcode?.trim() || randomBytes(4).toString('hex')

    // Auto-generate SKU if not provided
    let resolvedSku = sku?.trim() || null
    if (!resolvedSku) {
      const biz = await prisma.businesses.findFirst({ where: { id: businessId }, select: { type: true } })
      const prefix = (biz?.type?.substring(0, 3) || 'INV').toUpperCase()
      const seqResult = await prisma.$queryRaw<{ max_seq: number }[]>`
        SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(sku, '^[A-Z]+-INV-', '') AS INTEGER)), 0) AS max_seq
        FROM barcode_inventory_items
        WHERE "businessId" = ${businessId} AND sku ~ '^[A-Z]+-INV-[0-9]+$'
      `
      const nextSeq = Number(seqResult[0]?.max_seq || 0) + 1
      resolvedSku = `${prefix}-INV-${String(nextSeq).padStart(5, '0')}`
    }

    const item = await prisma.barcodeInventoryItems.create({
      data: {
        name: name.trim(),
        sku: resolvedSku,
        barcodeTemplateId: templateId || null,
        businessId,
        inventoryItemId,
        barcodeData,
        quantity: Number(quantity),
        stockQuantity: Number(quantity),
        customLabel: (description?.trim() || notes?.trim()) || undefined,
        costPrice: costPrice ? Number(costPrice) : null,
        sellingPrice: Number(sellingPrice),
        categoryId: categoryId || null,
        supplierId: supplierId || null,
        createdById: user.id,
      },
    })

    return NextResponse.json({ success: true, itemId: item.id, inventoryItemId: item.inventoryItemId, barcodeData: item.barcodeData })
  } catch (error) {
    console.error('[add-stock POST]', error)
    return NextResponse.json(
      { error: 'Failed to add stock. Please try again.' },
      { status: 500 }
    )
  }
}
