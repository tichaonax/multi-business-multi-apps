import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const items = await prisma.barcodeInventoryItems.findMany({
      where: { businessId, isActive: true, stockQuantity: { gt: 0 } },
      select: { id: true, name: true, sku: true, sellingPrice: true, stockQuantity: true, barcodeData: true, customLabel: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, items })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch inventory items' }, { status: 500 })
  }
}
