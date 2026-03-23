import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/inventory/[businessId]/barcode-items
 *
 * Returns active barcode inventory items for a business that have a selling price.
 * Used by the quick activity simulator to sell barcode-scanned inventory.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params

    const items = await prisma.barcodeInventoryItems.findMany({
      where: {
        businessId,
        isActive: true,
        sellingPrice: { gt: 0 },
        stockQuantity: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        customLabel: true,
        sku: true,
        sellingPrice: true,
        stockQuantity: true,
      },
      orderBy: { name: 'asc' },
      take: 500,
    })

    return NextResponse.json({
      success: true,
      items: items.map(item => ({
        id: item.id,
        name: item.name || item.customLabel || 'Item',
        sku: item.sku,
        sellingPrice: Number(item.sellingPrice),
        stockQuantity: item.stockQuantity,
      })),
    })
  } catch (error) {
    console.error('Error fetching barcode items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
