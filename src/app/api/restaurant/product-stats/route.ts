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

    // Query ALL of today's order items for this business (including those without variants)
    const todayItems = await prisma.businessOrderItems.findMany({
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
            business_products: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    console.log(`[product-stats] businessId=${businessId}, todayStart=${todayStart.toISOString()}, found ${todayItems.length} order items today`)

    // Aggregate by product — use variant linkage OR attributes.productId fallback
    const productStats: Record<string, { productId: string; productName: string; totalSold: number; soldToday: number }> = {}

    todayItems.forEach(item => {
      // Try to get product from variant linkage first
      let productId = item.product_variants?.business_products?.id
      let productName = item.product_variants?.business_products?.name

      // Fallback: use productId from attributes (for items without variant)
      if (!productId && item.attributes) {
        const attrs = item.attributes as Record<string, any>
        productId = attrs.productId
        productName = attrs.productName || 'Unknown'
      }

      if (!productId) return

      if (!productStats[productId]) {
        productStats[productId] = {
          productId,
          productName: productName || 'Unknown',
          totalSold: 0,
          soldToday: 0,
        }
      }

      const qty = Number(item.quantity)
      productStats[productId].totalSold += qty
      productStats[productId].soldToday += qty
    })

    const statsArray = Object.values(productStats).sort((a, b) => b.soldToday - a.soldToday)

    console.log(`[product-stats] Returning ${statsArray.length} products. Sample:`, statsArray.slice(0, 3).map(s => `${s.productName}: ${s.soldToday} sold today`))

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
