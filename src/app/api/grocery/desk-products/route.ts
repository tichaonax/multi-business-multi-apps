import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/grocery/desk-products?businessId=
 *
 * Returns ALL active, priced BarcodeInventoryItems for the grocery desk mode grid.
 * ALL categories are returned with their stockTotal so the client can score them
 * using sales data (productStatsMap) and decide which to show vs hide.
 * Items are NOT filtered by category — "All" shows everything.
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
        business_category: {
          select: { id: true, name: true, emoji: true, color: true, domain: { select: { emoji: true } } }
        },
        inventory_subcategory: { select: { emoji: true } }
      },
      orderBy: { name: 'asc' }
    })

    // Build category totals (ALL categories, no limit)
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

    // Return ALL categories sorted by stockTotal descending — client applies sales weighting
    const categories = Array.from(catMap.values())
      .sort((a, b) => b.stockTotal - a.stockTotal)

    // Return ALL items with a price (no category filter)
    const items = rawItems
      .map(item => ({
        id: `inv_${item.id}`,
        name: item.name,
        sku: item.sku ?? undefined,
        barcode: item.barcodeData ?? undefined,
        category: item.business_category?.name ?? 'Other',
        categoryId: item.categoryId ?? '__uncategorized__',
        categoryEmoji: item.business_category?.emoji ?? undefined,
        categoryColor: item.business_category?.color ?? '#3B82F6',
        subcategoryEmoji: item.inventory_subcategory?.emoji ?? undefined,
        domainEmoji: item.business_category?.domain?.emoji ?? undefined,
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
