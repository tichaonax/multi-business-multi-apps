import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildReceiptFromOrder } from '@/lib/printing/receipt-builder'
import { generateReceipt } from '@/lib/printing/receipt-templates'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

// Function to recursively remove null characters from strings in an object
function sanitizeForDatabase(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\u0000/g, '') // Remove null characters
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForDatabase)
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeForDatabase(obj[key])
      }
    }
    return sanitized
  }
  return obj
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await params
    const body = await request.json()
    const { notes } = body

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
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // Check if user has access to this business and permission to reprint
    // System admins always have access
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

      // Check if user has permission to reprint
      // Allow business owners, managers, and associates
      const allowedRoles = ['business-owner', 'business-manager', 'employee', 'restaurant-associate', 'grocery-associate', 'clothing-associate']
      if (!allowedRoles.includes(membership.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to reprint receipts' },
          { status: 403 }
        )
      }
    }

    // Log the reprint event
    const reprintLog = await prisma.reprintLog.create({
      data: {
        orderId: order.id,
        businessId: order.businessId,
        userId: user.id,
        receiptNumber: order.orderNumber,
        notes: notes ? notes.replace(/\u0000/g, '') : null, // Sanitize notes
      },
    })

    // Transform order to OrderData format
    const orderData = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId || undefined,
      customerName: order.business_customers?.name || 'Walk-in Customer',
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
      items: order.business_order_items.map(item => ({
        id: item.id,
        productVariantId: item.productVariantId || undefined,
        productName: item.product_variants?.business_products?.name || 'Unknown Product',
        quantity: parseFloat(item.quantity.toString()),
        unitPrice: parseFloat(item.unitPrice.toString()),
        discountAmount: parseFloat(item.discountAmount.toString()),
        totalPrice: parseFloat(item.totalPrice.toString()),
        attributes: item.attributes as any,
      })),
    }

    // Build receipt data with reprint flag (pass current user as fallback salesperson)
    const receiptData = await buildReceiptFromOrder(orderData, order.businessId, {
      isReprint: true,
      originalPrintDate: order.createdAt,
      reprintedBy: user.name || user.email,
      currentUserName: user.name || user.email,
      currentUserId: user.id,
    })

    if (!receiptData) {
      return NextResponse.json(
        { error: 'Failed to build receipt data' },
        { status: 500 }
      )
    }

    // Generate receipt text (thermal printer format)
    const receiptText = generateReceipt(receiptData)

    // Sanitize jobData to remove null characters
    const sanitizedJobData = sanitizeForDatabase({
      receiptData,
      receiptText,
      isReprint: true,
      reprintLogId: reprintLog.id,
    })

    // Create print job
    const printJob = await prisma.printJobs.create({
      data: {
        printerId: null, // TODO: Get from business settings or create default printer
        businessId: order.businessId,
        businessType: order.businessType,
        userId: user.id,
        jobType: 'receipt',
        jobData: sanitizedJobData,
        status: 'PENDING',
        retryCount: 0,
      },
      // Removed include - sync extension handles relation automatically
    })

    // TODO: Trigger actual printing (this would connect to the print queue worker)
    // For now, just return success with the print job ID

    return NextResponse.json({
      success: true,
      message: 'Receipt reprint queued successfully',
      reprintLog: {
        id: reprintLog.id,
        reprintedAt: reprintLog.reprintedAt,
      },
      printJob: {
        id: printJob.id,
        status: printJob.status,
      },
    })
  } catch (error) {
    console.error('Reprint receipt error:', error)
    return NextResponse.json(
      { error: 'Failed to reprint receipt' },
      { status: 500 }
    )
  }
}
