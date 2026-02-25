import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const timezone = searchParams.get('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone

    if (!businessId) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Today at midnight in the client's timezone
    const now = new Date()
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
    const [year, month, day] = dateStr.split('-').map(Number)
    const midnightUTC = Date.UTC(year, month - 1, day, 0, 0, 0)
    // Get timezone offset at midnight
    const utcStr = new Date(midnightUTC).toLocaleString('en-US', { timeZone: 'UTC' })
    const tzStr = new Date(midnightUTC).toLocaleString('en-US', { timeZone: timezone })
    const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime()
    const todayStart = new Date(midnightUTC - offsetMs)
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

    // Query today's AND yesterday's order items in parallel
    const [todayItems, yesterdayItems] = await Promise.all([
      prisma.businessOrderItems.findMany({
        where: {
          business_orders: {
            businessId,
            status: { not: 'CANCELLED' },
            createdAt: { gte: todayStart },
          },
        },
        select: {
          quantity: true,
          attributes: true,
          product_variants: {
            select: {
              productId: true,
              business_products: { select: { id: true, name: true } },
            },
          },
          business_orders: { select: { createdAt: true } },
        },
      }),
      prisma.businessOrderItems.findMany({
        where: {
          business_orders: {
            businessId,
            status: { not: 'CANCELLED' },
            createdAt: { gte: yesterdayStart, lt: todayStart },
          },
        },
        select: {
          quantity: true,
          attributes: true,
          product_variants: {
            select: {
              productId: true,
              business_products: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ])

    console.log(`[product-stats] businessId=${businessId}, todayStart=${todayStart.toISOString()}, found ${todayItems.length} order items today`)

    // Aggregate by product — use variant linkage OR attributes.productId fallback
    const productStats: Record<string, { productId: string; productName: string; totalSold: number; soldToday: number; firstSoldTodayAt: Date | null }> = {}

    todayItems.forEach(item => {
      // Try to get product from variant linkage first
      let productId = item.product_variants?.business_products?.id
      let productName = item.product_variants?.business_products?.name

      // Fallback: check attributes for productId or comboId
      if (!productId && item.attributes) {
        const attrs = item.attributes as Record<string, any>
        if (attrs.isCombo && attrs.comboId) {
          // Combo items — key must match the front-end id format: 'combo-{comboId}'
          productId = `combo-${attrs.comboId}`
          productName = attrs.productName || 'Combo'
        } else if (attrs.productId) {
          productId = attrs.productId
          productName = attrs.productName || 'Unknown'
        }
      }

      if (!productId) return

      const orderCreatedAt = item.business_orders?.createdAt ?? null

      if (!productStats[productId]) {
        productStats[productId] = {
          productId,
          productName: productName || 'Unknown',
          totalSold: 0,
          soldToday: 0,
          firstSoldTodayAt: orderCreatedAt,
        }
      } else {
        // Keep the earliest timestamp
        if (orderCreatedAt && (!productStats[productId].firstSoldTodayAt || orderCreatedAt < productStats[productId].firstSoldTodayAt!)) {
          productStats[productId].firstSoldTodayAt = orderCreatedAt
        }
      }

      const qty = Number(item.quantity)
      productStats[productId].totalSold += qty
      productStats[productId].soldToday += qty
    })

    // Aggregate yesterday's sold counts
    const yesterdaySoldMap: Record<string, number> = {}
    yesterdayItems.forEach(item => {
      let productId = item.product_variants?.business_products?.id
      if (!productId && item.attributes) {
        const attrs = item.attributes as Record<string, any>
        if (attrs.isCombo && attrs.comboId) productId = `combo-${attrs.comboId}`
        else if (attrs.productId) productId = attrs.productId
      }
      if (!productId) return
      yesterdaySoldMap[productId] = (yesterdaySoldMap[productId] || 0) + Number(item.quantity)
    })

    const statsArray = Object.values(productStats)
      .map(s => ({ ...s, soldYesterday: yesterdaySoldMap[s.productId] || 0 }))
      .sort((a, b) => b.soldToday - a.soldToday)

    console.log(`[product-stats] todayWindow: ${todayStart.toISOString()} → now`)
    console.log(`[product-stats] yesterdayWindow: ${yesterdayStart.toISOString()} → ${todayStart.toISOString()}`)
    console.log(`[product-stats] yesterdayItems found: ${yesterdayItems.length}`)
    console.log(`[product-stats] yesterdaySoldMap:`, yesterdaySoldMap)
    console.log(`[product-stats] Returning ${statsArray.length} products:`, statsArray.map(s => `${s.productName}: today=${s.soldToday}, yesterday=${s.soldYesterday}`))

    return NextResponse.json({
      success: true,
      data: statsArray,
    })
  } catch (error: any) {
    console.error('Error fetching product stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product statistics',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
