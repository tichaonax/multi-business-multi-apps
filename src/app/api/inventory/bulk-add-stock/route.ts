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

    // Resolve business type + current max INV sequence for auto-SKU generation
    const business = await prisma.businesses.findFirst({ where: { id: businessId }, select: { type: true } })
    const invPrefix = (business?.type?.substring(0, 3) || 'INV').toUpperCase()
    const seqResult = await prisma.$queryRaw<{ max_seq: number }[]>`
      SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(sku, '^[A-Z]+-INV-', '') AS INTEGER)), 0) AS max_seq
      FROM barcode_inventory_items
      WHERE "businessId" = ${businessId} AND sku ~ '^[A-Z]+-INV-[0-9]+$'
    `
    let invSeq = Number(seqResult[0]?.max_seq || 0)

    let created = 0
    let updated = 0
    const results: { success: boolean; itemId?: string; action?: 'created' | 'updated'; error?: string }[] = []

    for (const item of items) {
      try {
        const { name, categoryId, supplierId, description, quantity, sellingPrice, costPrice, sku, barcode, physicalCount, expiryDate } = item

        if (!name?.trim()) throw new Error('Name is required')
        if (!quantity || Number(quantity) < 1) throw new Error('Quantity must be >= 1')
        if (sellingPrice === undefined || sellingPrice === null || sellingPrice === '') throw new Error('Selling price is required')
        if (Number(sellingPrice) < 0) throw new Error('Selling price cannot be negative')

        const barcodeData = barcode?.trim() || null

        // Deduplicate: by barcode if provided, otherwise by name within this business
        const existing = barcodeData
          ? await prisma.barcodeInventoryItems.findFirst({ where: { businessId, barcodeData } })
          : await prisma.barcodeInventoryItems.findFirst({ where: { businessId, name: name.trim() } })

        if (existing) {
          // Existing item — if physicalCount provided (stock take), set stock = physical + new quantity
          // Otherwise fall back to incrementing (standard restock)
          const hasPhysicalCount = physicalCount !== undefined && physicalCount !== null && physicalCount !== ''
          const newStock = hasPhysicalCount
            ? Number(physicalCount) + Number(quantity)
            : existing.stockQuantity + Number(quantity)

          const updatedRecord = await prisma.barcodeInventoryItems.update({
            where: { id: existing.id },
            data: {
              stockQuantity: newStock,
              quantity: newStock,
              sellingPrice: Number(sellingPrice),
              ...(costPrice !== undefined && costPrice !== '' ? { costPrice: Number(costPrice) } : {}),
              lastOrderQty: Number(quantity),
              maxOrderQty: Math.max(existing.maxOrderQty ?? 0, Number(quantity)),
              lastOrderedAt: new Date(),
            },
          })
          if (expiryDate) {
            await prisma.itemExpiryBatch.create({
              data: {
                businessId,
                inventoryItemId: existing.id,
                quantity: Number(quantity),
                expiryDate: new Date(expiryDate),
                createdBy: user.id,
              },
            })
          }
          updated++
          results.push({ success: true, itemId: updatedRecord.id, action: 'updated' })
        } else {
          // New item — create
          const inventoryItemId = randomBytes(8).toString('hex')
          const resolvedSku = sku?.trim() || (() => { invSeq++; return `${invPrefix}-INV-${String(invSeq).padStart(5, '0')}` })()
          // When no barcode was scanned, generate a stable internal one at create time only
          const resolvedBarcodeData = barcodeData || randomBytes(4).toString('hex')
          const record = await prisma.barcodeInventoryItems.create({
            data: {
              name: name.trim(),
              sku: resolvedSku,
              businessId,
              inventoryItemId,
              barcodeData: resolvedBarcodeData,
              quantity: Number(quantity),
              stockQuantity: Number(quantity),
              customLabel: description?.trim() || undefined,
              costPrice: costPrice !== undefined && costPrice !== '' ? Number(costPrice) : null,
              sellingPrice: Number(sellingPrice),
              categoryId: categoryId || null,
              supplierId: supplierId || null,
              createdById: user.id,
              lastOrderQty: Number(quantity),
              maxOrderQty: Number(quantity),
              lastOrderedAt: new Date(),
            },
          })
          if (expiryDate) {
            await prisma.itemExpiryBatch.create({
              data: {
                businessId,
                inventoryItemId: record.id,
                quantity: Number(quantity),
                expiryDate: new Date(expiryDate),
                createdBy: user.id,
              },
            })
          }
          created++
          results.push({ success: true, itemId: record.id, action: 'created' })
        }
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
