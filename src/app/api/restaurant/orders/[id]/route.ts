import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// Get restaurant business IDs that user can access
async function getRestaurantBusinessIds(session: any) {
  const { prisma } = await import('@/lib/prisma')

  // Check if user is system admin - they can access all restaurant orders
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      business_memberships: {
        where: {
          businesses: { type: 'restaurant' },
          isActive: true
        },
        include: {
          businesses: { select: { id: true, name: true } }
        }
      }
    }
  })

  // If user is admin, get ALL active restaurant businesses
  if (user?.role === 'admin') {
    const allRestaurantBusinesses = await prisma.businesses.findMany({
      where: { type: 'restaurant', isActive: true },
      select: { id: true, name: true }
    })

    return allRestaurantBusinesses.map(b => b.id)
  }

  // For non-admin users, only return businesses they have membership to
  return user?.business_memberships?.map(m => m.businesses.id) || []
}

// PUT - Update order status using universal orders API
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get restaurant business IDs that user can access
    const restaurantBusinessIds = await getRestaurantBusinessIds(session)

    if (!restaurantBusinessIds.length) {
      return NextResponse.json({
        error: 'No restaurant business access found for user'
      }, { status: 403 })
    }

    const resolvedParams = await params
    const { id: orderId } = resolvedParams
    const body = await request.json()
    const { status, paymentStatus, paymentMethod, notes, ...otherUpdates } = body

    // Map restaurant statuses to universal statuses
    const statusMap: Record<string, string> = {
      'PENDING': 'PENDING',
      'CONFIRMED': 'CONFIRMED',
      'PREPARING': 'PROCESSING',
      'READY': 'READY',
      'SERVED': 'COMPLETED',
      'COMPLETED': 'COMPLETED',
      'CANCELLED': 'CANCELLED'
    }

    const paymentStatusMap: Record<string, string> = {
      'PENDING': 'PENDING',
      'PAID': 'PAID',
      'PARTIAL': 'PARTIALLY_PAID',
      'REFUNDED': 'REFUNDED'
    }

    // Build update data for universal API
    const updateData: any = { id: orderId }

    if (status) {
      updateData.status = statusMap[status] || status
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatusMap[paymentStatus] || paymentStatus
    }

    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod
    }

    if (notes) {
      updateData.notes = notes
    }

    // Include other attributes
    if (Object.keys(otherUpdates).length > 0) {
      updateData.attributes = otherUpdates
    }

    // Update order directly in businessOrder table
    const { prisma } = await import('@/lib/prisma')

    // Check if user is admin first
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    // Build update data
    const updateFields: any = {}

    if (status) {
      updateFields.status = statusMap[status] || status
    }

    if (paymentStatus) {
      updateFields.paymentStatus = paymentStatusMap[paymentStatus] || paymentStatus
    }

    if (paymentMethod) {
      updateFields.paymentMethod = paymentMethod
    }

    if (notes) {
      updateFields.notes = notes
    }

    // Update other attributes in the attributes JSON field
    if (Object.keys(otherUpdates).length > 0) {
      // Get current attributes and merge with new ones
      const currentOrder = await prisma.businessOrders.findUnique({
        where: { id: orderId },
        select: { attributes: true }
      })

      const currentAttributes = (currentOrder?.attributes as any) || {}
      updateFields.attributes = { ...currentAttributes, ...otherUpdates }
    }

    let whereClause: any = {
      id: orderId,
      businessType: 'restaurant'
    }

    // Only apply business filtering for non-admin users
    if (user?.role !== 'admin') {
      whereClause.businessId = { in: restaurantBusinessIds }
    }

    const updatedOrder = await prisma.businessOrders.update({
      where: whereClause,
      data: updateFields,
      include: {
        businesses: {
          select: {
            name: true,
            type: true
          }
        }
      }
    })

    // Transform to restaurant format
    const transformedOrder = {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      customerName: 'Walk-in Customer',
      status: mapStatusFromUniversal(updatedOrder.status),
      paymentStatus: mapPaymentStatusFromUniversal(updatedOrder.paymentStatus),
      paymentMethod: updatedOrder.paymentMethod,
      notes: updatedOrder.notes,
      updatedAt: updatedOrder.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: transformedOrder,
      message: 'Order status updated successfully'
    })

  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: 'Failed to update order status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET - Get specific order using universal orders API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { id: orderId } = resolvedParams

    // Get specific order directly from businessOrder table
    const { prisma } = await import('@/lib/prisma')

    const order = await prisma.businessOrders.findFirst({
      where: {
        id: orderId,
        businessType: 'restaurant'
      },
      include: {
        businesses: {
          select: {
            name: true,
            type: true
          }
        },
        employee: {
          select: {
            fullName: true
          }
        },
        businessOrderItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            product_variants: {
              select: {
                name: true,
                business_products: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify user has access to restaurant businesses (skip for admin)
    const userRole = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (userRole?.role !== 'admin') {
      const restaurantBusinessIds = await getRestaurantBusinessIds(session)
      if (!restaurantBusinessIds.includes(order.businessId)) {
        return NextResponse.json(
          { error: 'Access denied to this order' },
          { status: 403 }
        )
      }
    }

    // Transform businessOrder to restaurant format
    const transformedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: 'Walk-in Customer', // businessOrder doesn't have customer info
      customerPhone: '',
      customerEmail: '',
  tableNumber: (order.attributes as any)?.tableNumber || '',
      orderType: mapOrderTypeFromUniversal(order.orderType || 'SALE'),
      status: mapStatusFromUniversal(order.status),
      subtotal: Number(order.subtotal || 0),
      taxAmount: Number(order.taxAmount || 0),
  tipAmount: (order.attributes as any)?.tipAmount || 0,
      totalAmount: Number(order.totalAmount),
      paymentStatus: mapPaymentStatusFromUniversal(order.paymentStatus),
      paymentMethod: order.paymentMethod || '',
      notes: order.notes || '',
  estimatedReadyTime: (order.attributes as any)?.estimatedReadyTime || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      businessId: order.businessId,
      items: order.businessOrderItems.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        productName: item.product_variants?.businessProducts?.name || item.product_variants?.name || 'Unknown Item'
      }))
    }

    return NextResponse.json({
      success: true,
      data: transformedOrder
    })

  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper functions to map from universal to restaurant-specific values
function mapOrderTypeFromUniversal(universalType: string): string {
  const typeMap: Record<string, string> = {
    'SALE': 'DINE_IN',
    'TAKEOUT': 'TAKEOUT',
    'DELIVERY': 'DELIVERY'
  }
  return typeMap[universalType] || 'DINE_IN'
}

function mapStatusFromUniversal(universalStatus: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'PENDING',
    'CONFIRMED': 'CONFIRMED',
    'PROCESSING': 'PREPARING',
    'READY': 'READY',
    'COMPLETED': 'SERVED',
    'CANCELLED': 'CANCELLED'
  }
  return statusMap[universalStatus] || universalStatus
}

function mapPaymentStatusFromUniversal(universalPaymentStatus: string): string {
  const paymentStatusMap: Record<string, string> = {
    'PENDING': 'PENDING',
    'PAID': 'PAID',
    'PARTIALLY_PAID': 'PARTIAL',
    'REFUNDED': 'REFUNDED',
    'FAILED': 'PENDING'
  }
  return paymentStatusMap[universalPaymentStatus] || universalPaymentStatus
}