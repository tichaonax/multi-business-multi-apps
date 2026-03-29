import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/grocery/product-stats?businessId=&timezone=
 *
 * Returns per-product sold counts for today, yesterday, and the day before yesterday.
 * Keyed by productVariantId (for standard products) or "inv_{inventoryItemId}" for
 * BarcodeInventoryItem-based products — matching the IDs used in the grocery POS product grid.
 *
 * Used by the Desk Mode product cards to show sales performance bars.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const timezone = searchParams.get('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone

    if (!businessId) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Compute today, yesterday, and day-before-yesterday window boundaries in the client timezone
    const now = new Date()
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
    const [year, month, day] = dateStr.split('-').map(Number)
    const midnightUTC = Date.UTC(year, month - 1, day, 0, 0, 0)
    const utcStr = new Date(midnightUTC).toLocaleString('en-US', { timeZone: 'UTC' })
    const tzStr = new Date(midnightUTC).toLocaleString('en-US', { timeZone: timezone })
    const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime()

    const todayStart     = new Date(midnightUTC - offsetMs)
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
    const dayBeforeStart = new Date(todayStart.getTime() - 48 * 60 * 60 * 1000)

    // Fetch order items for the last 2 days in parallel
    const selectShape = {
      quantity: true,
      attributes: true,
      productVariantId: true,
      business_orders: { select: { createdAt: true } },
      product_variants: {
        select: {
          productId: true,
        },
      },
    } as const

    const [todayItems, yesterdayItems, dayBeforeItems] = await Promise.all([
      prisma.businessOrderItems.findMany({
        where: {
          business_orders: {
            businessId,
            status: { not: 'CANCELLED' },
            createdAt: { gte: todayStart },
          },
        },
        select: selectShape,
      }),
      prisma.businessOrderItems.findMany({
        where: {
          business_orders: {
            businessId,
            status: { not: 'CANCELLED' },
            createdAt: { gte: yesterdayStart, lt: todayStart },
          },
        },
        select: selectShape,
      }),
      prisma.businessOrderItems.findMany({
        where: {
          business_orders: {
            businessId,
            status: { not: 'CANCELLED' },
            createdAt: { gte: dayBeforeStart, lt: yesterdayStart },
          },
        },
        select: selectShape,
      }),
    ])

    // Helper: derive the front-end product key from an order item
    // - Standard products: productVariantId (matches variant.id used in grocery POS product grid)
    // - Inventory items: "inv_{inventoryItemId}" (matches inv_ prefix used in grocery POS)
    function getProductKey(item: typeof todayItems[0]): string | null {
      const attrs = item.attributes as Record<string, any> | null ?? {}

      // Inventory items stored with isInventoryItem flag
      if (attrs.isInventoryItem && attrs.inventoryItemId) {
        return `inv_${attrs.inventoryItemId}`
      }

      // Standard product — productVariantId matches front-end product.id
      if (item.productVariantId) {
        return item.productVariantId
      }

      return null
    }

    // Build today's stats (soldToday + firstSoldTodayAt)
    const statsMap: Record<string, { soldToday: number; firstSoldTodayAt: Date | null }> = {}

    for (const item of todayItems) {
      const key = getProductKey(item)
      if (!key) continue
      const qty = Number(item.quantity)
      const orderTime = item.business_orders?.createdAt ?? null

      if (!statsMap[key]) {
        statsMap[key] = { soldToday: qty, firstSoldTodayAt: orderTime }
      } else {
        statsMap[key].soldToday += qty
        if (orderTime && (!statsMap[key].firstSoldTodayAt || orderTime < statsMap[key].firstSoldTodayAt!)) {
          statsMap[key].firstSoldTodayAt = orderTime
        }
      }
    }

    // Build yesterday counts
    const yesterdayMap: Record<string, number> = {}
    for (const item of yesterdayItems) {
      const key = getProductKey(item)
      if (!key) continue
      yesterdayMap[key] = (yesterdayMap[key] || 0) + Number(item.quantity)
    }

    // Build day-before counts
    const dayBeforeMap: Record<string, number> = {}
    for (const item of dayBeforeItems) {
      const key = getProductKey(item)
      if (!key) continue
      dayBeforeMap[key] = (dayBeforeMap[key] || 0) + Number(item.quantity)
    }

    // Merge into final array — only products with activity in any of the three windows
    const allKeys = new Set([
      ...Object.keys(statsMap),
      ...Object.keys(yesterdayMap),
      ...Object.keys(dayBeforeMap),
    ])

    const data = Array.from(allKeys).map(productId => ({
      productId,
      soldToday:     statsMap[productId]?.soldToday     ?? 0,
      soldYesterday: yesterdayMap[productId]            ?? 0,
      soldDayBefore: dayBeforeMap[productId]            ?? 0,
      firstSoldTodayAt: statsMap[productId]?.firstSoldTodayAt ?? null,
    })).sort((a, b) => b.soldToday - a.soldToday)

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[grocery/product-stats] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product statistics', details: error.message },
      { status: 500 }
    )
  }
}
