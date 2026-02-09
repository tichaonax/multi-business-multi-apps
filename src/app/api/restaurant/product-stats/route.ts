import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get today's business day (5AM cutoff)
function getTodayBusinessDay(timezone: string = 'America/New_York'): { start: Date; end: Date } {
  const now = new Date()
  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  })
  const currentHour = parseInt(hourFormatter.format(now), 10)

  let businessDayDate = now
  if (currentHour < 5) {
    businessDayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateStr = dateFormatter.format(businessDayDate)
  const [year, month, day] = dateStr.split('-').map(Number)
  const start = new Date(year, month - 1, day, 5, 0, 0)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const timezone = searchParams.get('timezone') || 'America/New_York'

    // Build where clause for orders
    const orderWhere: any = {
      businessType: 'restaurant',
      status: { not: 'CANCELLED' }
    }

    if (businessId) {
      orderWhere.businessId = businessId
    }

    // Get today's business day window
    const { start, end } = getTodayBusinessDay(timezone)

    // Get all order items for restaurant orders
    const orderItems = await prisma.businessOrderItems.findMany({
      where: {
        business_orders: orderWhere
      },
      include: {
        business_orders: {
          select: { createdAt: true }
        },
        product_variants: {
          include: {
            business_products: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Aggregate purchase counts by product (all-time + today)
    const productStats: Record<string, { productId: string; productName: string; totalSold: number; soldToday: number }> = {}

    orderItems.forEach(item => {
      const product = item.product_variants?.business_products
      if (product) {
        if (!productStats[product.id]) {
          productStats[product.id] = {
            productId: product.id,
            productName: product.name,
            totalSold: 0,
            soldToday: 0
          }
        }
        const qty = Number(item.quantity)
        productStats[product.id].totalSold += qty

        // Check if this order item is from today's business day
        const orderDate = item.business_orders?.createdAt
        if (orderDate && orderDate >= start && orderDate < end) {
          productStats[product.id].soldToday += qty
        }
      }
    })

    // Convert to array and sort by total sold descending
    const statsArray = Object.values(productStats).sort((a, b) => b.totalSold - a.totalSold)

    return NextResponse.json({
      success: true,
      data: statsArray
    })

  } catch (error: any) {
    console.error('Error fetching product stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product statistics',
        details: error.message
      },
      { status: 500 }
    )
  }
}
