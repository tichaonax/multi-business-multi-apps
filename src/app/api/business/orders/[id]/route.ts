import { NextRequest, NextResponse } from 'next/server'
import { isSystemAdmin} from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

// GET - Get specific business order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
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
        employees: {
          select: {
            fullName: true
          }
        },
        business_customers: {
          select: {
            name: true,
            phone: true,
          }
        },
        business_order_items: {
          select: {
            id: true,
            createdAt: true,
            quantity: true,
            unitPrice: true,
            discountAmount: true,
            totalPrice: true,
            attributes: true,
            product_variants: {
              select: {
                id: true,
                name: true,
                sku: true,
                business_products: {
                  select: {
                    name: true,
                    sku: true,
                    business_categories: { select: { name: true, emoji: true } }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    // System admins can access any business order
    if (!isSystemAdmin(user)) {
      // Verify user has access to the business that owns this order
      const userHasAccess = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
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
      business: order.businesses,
      businesses: order.businesses,
      employee: order.employees,
      salesperson: order.employees?.fullName || null,
      customerName: order.business_customers?.name || (order.attributes as any)?.customerName || null,
      customerPhone: order.business_customers?.phone || (order.attributes as any)?.customerPhone || null,
      businessType: order.businessType,
      orderType: order.attributes?.orderType || order.orderType || 'SALE',
      paymentMethod: order.paymentMethod || '',
      paymentStatus: order.paymentStatus || '',
      attributes: order.attributes,
      items: (order.business_order_items ?? []).map((item: any) => {
        const variant = item.product_variants
        const product = variant?.business_products
        // Prefer variant name if set, otherwise fall back to product name
        const attrProductName = (item.attributes as any)?.productName
        const baseProductName = product?.name || attrProductName || 'Unknown Product'
        const variantName = variant?.name
        // Show "Product (Variant)" only when variant name differs from product name
        const productName = variantName && variantName !== baseProductName
          ? `${baseProductName} (${variantName})`
          : baseProductName
        return {
          id: item.id,
          productId: variant?.id ?? '',
          productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.totalPrice),
          attributes: item.attributes,
          product: (product || attrProductName) ? {
            name: product?.name ?? attrProductName,
            sku: variant?.sku ?? product?.sku,
            category: product?.business_categories?.name,
            categoryEmoji: product?.business_categories?.emoji
          } : undefined
        }
      })
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
    const user = await getServerUser()
    if (!user) {
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