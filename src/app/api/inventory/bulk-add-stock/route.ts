import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/inventory/bulk-add-stock
 *
 * Batch creates BarcodeInventoryItems records.
 * Body: { businessId, items: [{ barcode, name, categoryId, supplierId, description, quantity, sellingPrice, costPrice, sku }] }
 * Returns: { success, created, results: [{ success, itemId?, error? }] }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, items } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'items array is required' }, { status: 400 })

    let created = 0
    const results: { success: boolean; itemId?: string; error?: string }[] = []

    for (const item of items) {
      try {
        const { name, categoryId, supplierId, description, quantity, sellingPrice, costPrice, sku, barcode } = item

        if (!name?.trim()) throw new Error('Name is required')
        if (!quantity || Number(quantity) < 1) throw new Error('Quantity must be >= 1')
        if (sellingPrice === undefined || sellingPrice === null || sellingPrice === '') throw new Error('Selling price is required')
        if (Number(sellingPrice) < 0) throw new Error('Selling price cannot be negative')

        const inventoryItemId = randomBytes(8).toString('hex')
        const barcodeData = barcode?.trim() || randomBytes(4).toString('hex')

        const record = await prisma.barcodeInventoryItems.create({
          data: {
            name: name.trim(),
            sku: sku?.trim() || undefined,
            businessId,
            inventoryItemId,
            barcodeData,
            quantity: Number(quantity),
            stockQuantity: Number(quantity),
            customLabel: description?.trim() || undefined,
            costPrice: costPrice !== undefined && costPrice !== '' ? Number(costPrice) : null,
            sellingPrice: Number(sellingPrice),
            categoryId: categoryId || null,
            supplierId: supplierId || null,
            createdById: user.id,
          },
        })

        created++
        results.push({ success: true, itemId: record.id })
      } catch (e: any) {
        results.push({ success: false, error: e.message || 'Failed to save item' })
      }
    }

    return NextResponse.json({ success: true, created, results })
  } catch (error) {
    console.error('[bulk-add-stock POST]', error)
    return NextResponse.json({ error: 'Batch submission failed' }, { status: 500 })
  }
}
