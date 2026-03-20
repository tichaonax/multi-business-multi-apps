import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { itemId } = await params
    const item = await prisma.barcodeInventoryItems.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, sku: true, sellingPrice: true, stockQuantity: true, businessId: true, barcodeData: true },
    })

    if (!item) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, item: { ...item, inventoryItemId: item.id } })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch item' }, { status: 500 })
  }
}
