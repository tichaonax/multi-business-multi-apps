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

    // Hide [test]-named inventory items unless the business has explicitly
    // enabled test data visibility (admin > Edit Business > Show Test Data toggle)
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { showTestData: true }
    })

    const items = await prisma.barcodeInventoryItems.findMany({
      where: {
        businessId,
        isActive: true,
        stockQuantity: { gt: 0 },
        ...(business?.showTestData ? {} : { NOT: { name: { contains: '[test]', mode: 'insensitive' } } })
      },
      select: { id: true, name: true, sku: true, sellingPrice: true, stockQuantity: true, barcodeData: true, customLabel: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, items })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch inventory items' }, { status: 500 })
  }
}
