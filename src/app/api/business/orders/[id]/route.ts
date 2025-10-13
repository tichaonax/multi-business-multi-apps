import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

// GET - Get specific business order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId } = await params

    // Remove "order-" prefix if present
    const cleanOrderId = orderId.startsWith('order-') ? orderId.substring(6) : orderId

    // Get order directly from businessOrder table
    const { prisma } = await import('@/lib/prisma')

    const order = await prisma.businessOrders.findFirst({
      where: {
        id: cleanOrderId
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
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const user = session.user as SessionUser

    // System admins can access any business order
    if (!isSystemAdmin(user)) {
      // Verify user has access to the business that owns this order
      const userHasAccess = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.users.id,
          businessId: order.businessId,
          isActive: true
        }
      })

      if (!userHasAccess) {
        return NextResponse.json(
          { error: 'Access denied to this order' },
          { status: 403 }
        )
      }
    }

    // Transform to business order format
    const transformedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: Number(order.subtotal || 0),
      taxAmount: Number(order.taxAmount || 0),
      totalAmount: Number(order.totalAmount),
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod || '',
      notes: order.notes || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      businessId: order.businessId,
      business: order.business,
      employee: order.employee,
      businessType: order.businessType,
      orderType: order.attributes?.orderType || order.orderType || 'SALE', // Add orderType at root level
      attributes: order.attributes
    }

    return NextResponse.json({
      success: true,
      data: transformedOrder
    })

  } catch (error) {
    console.error('Error fetching business order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update business order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = await request.json()

    // Remove "order-" prefix if present
    const cleanOrderId = orderId.startsWith('order-') ? orderId.substring(6) : orderId

    const { status, paymentStatus, paymentMethod, notes, ...otherUpdates } = body

    // Update order directly in businessOrder table
    const { prisma } = await import('@/lib/prisma')

    // Build update data
    const updateFields: any = {}

    if (status) {
      updateFields.status = status
    }

    if (paymentStatus) {
      updateFields.paymentStatus = paymentStatus
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
        where: { id: cleanOrderId },
        select: { attributes: true }
      })

      const currentAttributes = (currentOrder?.attributes as any) || {}
      updateFields.attributes = { ...currentAttributes, ...otherUpdates }
    }

    const updatedOrder = await prisma.businessOrders.update({
      where: {
        id: cleanOrderId
      },
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

    // Transform to business order format
    const transformedOrder = {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
      paymentMethod: updatedOrder.paymentMethod,
      notes: updatedOrder.notes,
      updatedAt: updatedOrder.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: transformedOrder,
      message: 'Order updated successfully'
    })

  } catch (error) {
    console.error('Error updating business order:', error)
    return NextResponse.json(
      { error: 'Failed to update order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}