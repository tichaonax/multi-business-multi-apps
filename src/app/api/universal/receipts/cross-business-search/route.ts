import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''

    if (!query) {
      return NextResponse.json({ error: 'query parameter is required' }, { status: 400 })
    }

    // Get all businesses user has access to
    const memberships = await prisma.businessMemberships.findMany({
      where: {
        userId: user.id,
      },
      select: {
        businessId: true,
      },
    })

    const businessIds = memberships.map(m => m.businessId)

    if (businessIds.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
      })
    }

    // Search across all accessible businesses
    const orders = await prisma.businessOrders.findMany({
      where: {
        businessId: { in: businessIds },
        OR: [
          { orderNumber: { contains: query, mode: 'insensitive' } },
          { customerId: { contains: query, mode: 'insensitive' } },
          { totalAmount: { equals: parseFloat(query) || undefined } },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        totalAmount: true,
        businessType: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
        businessId: true,
        businesses: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        business_customers: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit cross-business search results
    })

    // Group results by business
    const resultsByBusiness = orders.reduce((acc, order) => {
      const businessId = order.businessId
      if (!acc[businessId]) {
        acc[businessId] = {
          business: {
            id: order.businesses.id,
            name: order.businesses.name,
            type: order.businesses.type,
          },
          orders: [],
        }
      }
      acc[businessId].orders.push({
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.business_customers?.name || 'Walk-in Customer',
        totalAmount: order.totalAmount,
        businessType: order.businessType,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdAt,
      })
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      results: Object.values(resultsByBusiness),
      totalBusinesses: Object.keys(resultsByBusiness).length,
      totalOrders: orders.length,
    })
  } catch (error) {
    console.error('Cross-business receipt search error:', error)
    return NextResponse.json(
      { error: 'Failed to search receipts across businesses' },
      { status: 500 }
    )
  }
}
