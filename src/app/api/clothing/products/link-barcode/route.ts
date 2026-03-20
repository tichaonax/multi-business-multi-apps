import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/clothing/products/link-barcode
 * Associate a scanned barcode with an existing bale or product.
 * Body: { itemId, itemType: 'bale' | 'product', barcode }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { itemId, itemType, barcode } = body

    if (!itemId) return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    if (!barcode?.trim()) return NextResponse.json({ error: 'barcode is required' }, { status: 400 })

    const type = itemType ?? 'bale'

    if (type === 'bale') {
      const bale = await prisma.clothingBales.findUnique({ where: { id: itemId } })
      if (!bale) return NextResponse.json({ error: 'Bale not found' }, { status: 404 })

      const updated = await prisma.clothingBales.update({
        where: { id: itemId },
        data: { barcode: barcode.trim() },
        include: { category: { select: { name: true } } },
      })
      return NextResponse.json({ success: true, item: { id: updated.id, batchNumber: updated.batchNumber, barcode: updated.barcode, categoryName: updated.category.name } })
    }

    // Generic product: upsert via ProductBarcodes table
    const existing = await prisma.productBarcodes.findFirst({ where: { productId: itemId, isPrimary: true } })
    if (existing) {
      await prisma.productBarcodes.update({ where: { id: existing.id }, data: { code: barcode.trim() } })
    } else {
      await prisma.productBarcodes.create({ data: { productId: itemId, code: barcode.trim(), type: 'CODE128', isPrimary: true } })
    }
    return NextResponse.json({ success: true, item: { id: itemId, barcode: barcode.trim() } })
  } catch (error) {
    console.error('[link-barcode POST]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to link barcode' },
      { status: 500 }
    )
  }
}
