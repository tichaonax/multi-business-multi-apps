import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/grocery/desk-products?businessId=
 *
 * Returns ALL active, priced BarcodeInventoryItems for the grocery desk mode grid,
 * plus any SERVICE-type BusinessProducts (e.g. cellphone charging) which have no
 * stock concept and should always be available for sale.
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

    const [rawItems, serviceProducts] = await Promise.all([
      prisma.barcodeInventoryItems.findMany({
        where: { businessId, isActive: true, stockQuantity: { gt: 0 } },
        include: {
          business_category: {
            select: { id: true, name: true, emoji: true, color: true, domain: { select: { emoji: true } } }
          },
          inventory_subcategory: { select: { emoji: true } }
        },
        orderBy: { name: 'asc' }
      }),
      // SERVICE-type products have no stock concept — always include them
      prisma.businessProducts.findMany({
        where: { businessId, isActive: true, isAvailable: true, productType: 'SERVICE', basePrice: { gt: 0 } },
        include: {
          business_categories: { select: { id: true, name: true, emoji: true, color: true } },
          product_variants: { where: { isActive: true }, take: 1 }
        },
        orderBy: { name: 'asc' }
      })
    ])

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

    // Ensure service categories appear in the category tabs even if no inventory items exist there
    for (const svc of serviceProducts) {
      const catKey = svc.categoryId ?? '__uncategorized__'
      if (!catMap.has(catKey)) {
        catMap.set(catKey, {
          key: catKey,
          label: svc.business_categories?.name ?? 'Services',
          emoji: svc.business_categories?.emoji ?? '🛎️',
          stockTotal: 0
        })
      }
    }

    // Return ALL categories sorted by stockTotal descending — client applies sales weighting
    // Merge same-name categories (e.g. two "Soft Drinks" rows with different domainIds) by
    // combining their UUIDs into a comma-separated key and summing stockTotal.
    const mergedByName = new Map<string, { key: string; label: string; emoji: string; stockTotal: number }>()
    for (const cat of catMap.values()) {
      const existing = mergedByName.get(cat.label)
      if (existing) {
        existing.key = existing.key + ',' + cat.key
        existing.stockTotal += cat.stockTotal
      } else {
        mergedByName.set(cat.label, { ...cat })
      }
    }
    const categories = Array.from(mergedByName.values())
      .sort((a, b) => a.label.localeCompare(b.label))

    // Return ALL inventory items with a price (no category filter)
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
        isExpiryDiscount: item.isExpiryDiscount,
      }))
      .filter(item => item.price > 0)

    // Append service products — use variant ID so the orders API routes them as BusinessProducts
    // (no inv_ prefix = no stock decrement, no stock check)
    const serviceItems = serviceProducts.map(svc => {
      const variant = svc.product_variants[0]
      return {
        id: variant?.id ?? svc.id,
        name: svc.name,
        sku: svc.sku ?? undefined,
        barcode: undefined,
        category: svc.business_categories?.name ?? 'Services',
        categoryId: svc.categoryId ?? '__uncategorized__',
        categoryEmoji: svc.business_categories?.emoji ?? '🛎️',
        categoryColor: svc.business_categories?.color ?? '#8B5CF6',
        subcategoryEmoji: undefined,
        domainEmoji: undefined,
        price: parseFloat(svc.basePrice.toString()),
        stockQuantity: undefined, // services have no stock concept — always visible
        unitType: 'each' as const,
        unit: 'each',
        taxable: false,
        weightRequired: false,
        pluCode: svc.sku ?? undefined,
        isExpiryDiscount: false,
      }
    })

    return NextResponse.json({ success: true, categories, items: [...items, ...serviceItems] })
  } catch (error: any) {
    console.error('[grocery/desk-products] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch desk products', details: error.message },
      { status: 500 }
    )
  }
}
