import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/grocery/desk-products?businessId=
 *
 * Returns BarcodeInventoryItems (active, in-stock) for the grocery desk mode grid.
 * Items are keyed by inv_{inventoryItemId} to match the POS cart format.
 * Categories are derived from BusinessCategories linked via categoryId,
 * sorted by total stockQuantity descending, limited to top 10 tabs.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ success: true, categories: [], items: [] })
    }

    const rawItems = await prisma.barcodeInventoryItems.findMany({
      where: { businessId, isActive: true, stockQuantity: { gt: 0 } },
      include: {
        business_category: { select: { id: true, name: true, emoji: true } }
      },
      orderBy: { name: 'asc' }
    })

    // Build category totals
    const catMap = new Map<string, { key: string; label: string; emoji: string; stockTotal: number }>()

    for (const item of rawItems) {
      const catKey = item.categoryId ?? '__uncategorized__'
      const catLabel = item.business_category?.name ?? 'Other'
      const catEmoji = item.business_category?.emoji ?? '📦'

      if (!catMap.has(catKey)) {
        catMap.set(catKey, { key: catKey, label: catLabel, emoji: catEmoji, stockTotal: 0 })
      }
      catMap.get(catKey)!.stockTotal += item.stockQuantity
    }

    // Top 10 categories by stockTotal
    const categories = Array.from(catMap.values())
      .sort((a, b) => b.stockTotal - a.stockTotal)
      .slice(0, 10)

    const topCatKeys = new Set(categories.map(c => c.key))

    // Map items in top categories to POSItem-compatible format
    const items = rawItems
      .filter(item => {
        const catKey = item.categoryId ?? '__uncategorized__'
        return topCatKeys.has(catKey)
      })
      .map(item => ({
        id: `inv_${item.id}`,
        name: item.name,
        sku: item.sku ?? undefined,
        barcode: item.barcodeData ?? undefined,
        category: item.business_category?.name ?? 'Other',
        categoryId: item.categoryId ?? '__uncategorized__',
        price: item.sellingPrice ? parseFloat(item.sellingPrice.toString()) : 0,
        stockQuantity: item.stockQuantity,
        unitType: 'each' as const,
        unit: 'each',
        taxable: false,
        weightRequired: false,
        pluCode: item.sku ?? undefined,
      }))
      .filter(item => item.price > 0)

    return NextResponse.json({ success: true, categories, items })
  } catch (error: any) {
    console.error('[grocery/desk-products] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch desk products', details: error.message },
      { status: 500 }
    )
  }
}
