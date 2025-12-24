import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isSystemAdmin } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const query = searchParams.get('query') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    // Check if user has access to this business (system admins have access to all)
    if (!isSystemAdmin(session.user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: businessId,
        },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
      }
    }

    // Build where clause for search
    const whereClause: any = {
      businessId: businessId,
    }

    // Add query filter if provided
    if (query) {
      whereClause.OR = [
        { orderNumber: { contains: query, mode: 'insensitive' } },
        { customerId: { contains: query, mode: 'insensitive' } },
        { totalAmount: { equals: parseFloat(query) || undefined } },
      ]
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }

    // Fetch orders
    const orders = await prisma.businessOrders.findMany({
      where: whereClause,
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        employeeId: true,
        totalAmount: true,
        businessType: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
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
      take: limit,
      skip: offset,
    })

    // Get total count for pagination
    const totalCount = await prisma.businessOrders.count({
      where: whereClause,
    })

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.business_customers?.name || 'Walk-in Customer',
        salespersonName: order.employees?.fullName || null,
        totalAmount: order.totalAmount,
        businessType: order.businessType,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdAt,
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Receipt search error:', error)
    return NextResponse.json(
      { error: 'Failed to search receipts' },
      { status: 500 }
    )
  }
}
