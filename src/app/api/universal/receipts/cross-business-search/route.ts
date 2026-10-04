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

    // Search across all accessible businesses — mirrors the same-business
    // search's query logic (receipt #, customer, salesperson, notes, and
    // purchased item/product names), not just orderNumber/customerId/amount,
    // so a query that only matches on a product name (e.g. "zambezi") can
    // still be found here when it's a fallback for the main search coming
    // back empty in the currently-selected business.
    const asNumber = parseFloat(query)
    const orders = await prisma.businessOrders.findMany({
      where: {
        businessId: { in: businessIds },
        OR: [
          { orderNumber: { contains: query, mode: 'insensitive' } },
          { customerId: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
          { business_customers: { name: { contains: query, mode: 'insensitive' } } },
          { employees: { fullName: { contains: query, mode: 'insensitive' } } },
          { attributes: { path: ['employeeName'], string_contains: query } },
          { attributes: { path: ['soldByName'], string_contains: query } },
          { attributes: { path: ['participantName'], string_contains: query } },
          {
            business_order_items: {
              some: {
                OR: [
                  { product_variants: { name: { contains: query, mode: 'insensitive' } } },
                  { product_variants: { business_products: { name: { contains: query, mode: 'insensitive' } } } },
                  { attributes: { path: ['productName'], string_contains: query } },
                ],
              },
            },
          },
          ...(isNaN(asNumber) ? [] : [{ totalAmount: { equals: asNumber } }]),
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
        attributes: true,
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
        employees: {
          select: {
            fullName: true,
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
        customerName: order.business_customers?.name || (order.attributes as any)?.participantName || 'Walk-in Customer',
        salespersonName: order.employees?.fullName
          || (order.attributes as any)?.employeeName
          || (order.attributes as any)?.soldByName
          || null,
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
