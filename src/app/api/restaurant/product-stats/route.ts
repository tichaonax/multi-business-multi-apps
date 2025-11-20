import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    // Build where clause for orders
    const orderWhere: any = {
      businessType: 'restaurant',
      status: { not: 'CANCELLED' } // Exclude cancelled orders
    }

    if (businessId) {
      orderWhere.businessId = businessId
    }

    // Get all order items for restaurant orders
    const orderItems = await prisma.businessOrderItems.findMany({
      where: {
        business_orders: orderWhere
      },
      include: {
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

    // Aggregate purchase counts by product
    const productStats: Record<string, { productId: string; productName: string; totalSold: number }> = {}

    orderItems.forEach(item => {
      const product = item.product_variants?.business_products
      if (product) {
        if (!productStats[product.id]) {
          productStats[product.id] = {
            productId: product.id,
            productName: product.name,
            totalSold: 0
          }
        }
        productStats[product.id].totalSold += Number(item.quantity)
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
