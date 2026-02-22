import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildReceiptFromOrder } from '@/lib/printing/receipt-builder'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await params

    // Fetch order with all related data
    const order = await prisma.businessOrders.findUnique({
      where: { id: orderId },
      include: {
        business_order_items: {
          include: {
            product_variants: {
              include: {
                business_products: true,
              },
            },
          },
        },
        businesses: true,
        business_customers: true,
        employees: true,
        reprint_logs: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            reprintedAt: 'desc',
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // Check if user has access to this business (system admins have access to all)
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          businessId: order.businessId,
        },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Access denied to this receipt' }, { status: 403 })
      }
    }

    // Transform order to OrderData format for receipt builder
    const orderData = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId || undefined,
      customerName: order.business_customers?.name || (order.attributes as any)?.participantName || 'Walk-in Customer',
      employeeId: order.employeeId || undefined,
      employeeName: order.employees?.fullName || undefined,
      orderType: order.orderType,
      status: order.status,
      subtotal: parseFloat(order.subtotal.toString()),
      taxAmount: parseFloat(order.taxAmount.toString()),
      discountAmount: parseFloat(order.discountAmount.toString()),
      totalAmount: parseFloat(order.totalAmount.toString()),
      paymentMethod: order.paymentMethod || 'CASH',
      paymentStatus: order.paymentStatus,
      businessType: order.businessType,
      attributes: order.attributes as any,
      notes: order.notes || undefined,
      processedAt: order.processedAt || order.createdAt,
      createdAt: order.createdAt,
      items: order.business_order_items.map(item => {
        const productName = item.product_variants?.business_products?.name || (item.attributes as any)?.productName || 'Unknown Product'
        const variantName = (item.product_variants as any)?.name
        // Append variant details only when they differ from the product name
        const fullName = variantName && variantName !== productName
          ? `${productName} (${variantName})`
          : productName
        return {
          id: item.id,
          productVariantId: item.productVariantId || undefined,
          name: fullName,
          quantity: parseFloat(item.quantity.toString()),
          unitPrice: parseFloat(item.unitPrice.toString()),
          discountAmount: parseFloat(item.discountAmount.toString()),
          totalPrice: parseFloat(item.totalPrice.toString()),
          attributes: item.attributes as any,
        }
      }),
    }

    // Build receipt data (pass current user as fallback salesperson)
    const receiptData = await buildReceiptFromOrder(orderData, order.businessId, {
      currentUserName: user.name || user.email,
      currentUserId: user.id,
    })

    if (!receiptData) {
      return NextResponse.json(
        { error: 'Failed to build receipt data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      receipt: receiptData,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        businessId: order.businessId,
        businessName: order.businesses.name,
        businessType: order.businessType,
        totalAmount: order.totalAmount,
        customerName: order.business_customers?.name || null,
        employeeName: order.employees?.fullName || (order.attributes as any)?.employeeName || null,
        customerPhone: order.business_customers?.phone || null,
        paymentMethod: order.paymentMethod || null,
        paymentStatus: order.paymentStatus || null,
        discountAmount: parseFloat(order.discountAmount.toString()),
        rewardCouponCode: (order.attributes as any)?.rewardCouponCode || null,
        createdAt: order.createdAt,
        reprintHistory: order.reprint_logs.map(log => ({
          id: log.id,
          reprintedAt: log.reprintedAt,
          reprintedBy: log.user.name,
          notes: log.notes,
        })),
      },
    })
  } catch (error) {
    console.error('Get receipt error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch receipt' },
      { status: 500 }
    )
  }
}
