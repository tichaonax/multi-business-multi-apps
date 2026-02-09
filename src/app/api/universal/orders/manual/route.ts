import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isSystemAdmin, hasPermission, SessionUser } from '@/lib/permission-utils'

// Business type to order number prefix mapping
const ORDER_PREFIX: Record<string, string> = {
  clothing: 'CLO',
  hardware: 'HWD',
  grocery: 'GRC',
  restaurant: 'RST',
  consulting: 'CON',
  services: 'SVC',
  retail: 'RTL',
  construction: 'CTN',
  vehicles: 'VEH',
}

function generateManualOrderNumber(businessType: string, transactionDate: string, orderCount: number): string {
  const prefix = ORDER_PREFIX[businessType] || 'BIZ'
  const date = transactionDate.replace(/-/g, '')
  const counter = String(orderCount + 1).padStart(4, '0')
  return `${prefix}-${date}-M${counter}`
}

/**
 * POST /api/universal/orders/manual
 * Create a backdated manual order entry from book records
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check permission
    if (!isSystemAdmin(user) && !hasPermission(user, 'canEnterManualOrders')) {
      // Fallback: check active business membership
      const body = await request.json()
      const hasActiveMembership = user.businessMemberships?.some(
        (m: any) => m.businessId === body.businessId && m.isActive
      )
      if (!hasActiveMembership) {
        return NextResponse.json(
          { error: 'You do not have permission to enter manual orders.' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const {
      businessId,
      businessType,
      transactionDate,
      customerId,
      paymentMethod = 'CASH',
      notes,
      items,
    } = body

    // Validate required fields
    if (!businessId || !businessType || !transactionDate || !items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, businessType, transactionDate, items' },
        { status: 400 }
      )
    }

    // Validate transaction date
    const txDate = new Date(transactionDate + 'T12:00:00Z')
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    if (isNaN(txDate.getTime())) {
      return NextResponse.json({ error: 'Invalid transaction date' }, { status: 400 })
    }

    if (txDate > now) {
      return NextResponse.json({ error: 'Transaction date cannot be in the future' }, { status: 400 })
    }

    if (txDate < sevenDaysAgo) {
      return NextResponse.json({ error: 'Transaction date cannot be more than 7 days ago' }, { status: 400 })
    }

    // Check if books are closed for this date
    const closedBooks = await prisma.savedReports.findUnique({
      where: {
        businessId_reportType_reportDate: {
          businessId,
          reportType: 'DAILY_BOOKS_CLOSE',
          reportDate: new Date(transactionDate + 'T00:00:00Z'),
        },
      },
    })

    if (closedBooks) {
      return NextResponse.json(
        { error: `Books are closed for ${transactionDate}. No more manual entries can be added.` },
        { status: 409 }
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.name || item.quantity == null || item.unitPrice == null) {
        return NextResponse.json(
          { error: 'Each item must have name, quantity, and unitPrice' },
          { status: 400 }
        )
      }
      if (item.quantity <= 0) {
        return NextResponse.json({ error: 'Item quantity must be positive' }, { status: 400 })
      }
      if (item.unitPrice < 0) {
        return NextResponse.json({ error: 'Item unit price cannot be negative' }, { status: 400 })
      }
    }

    // Look up employee record for this user (employeeId FK references Employees table, not Users)
    const employee = await prisma.employees.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => {
      const discount = item.discountAmount || 0
      return sum + (item.quantity * item.unitPrice) - discount
    }, 0)

    // Count existing manual orders for this business on this date (for order number)
    const existingCount = await prisma.businessOrders.count({
      where: {
        businessId,
        isManualEntry: true,
        transactionDate: new Date(transactionDate + 'T12:00:00Z'),
      },
    })

    const orderNumber = generateManualOrderNumber(businessType, transactionDate, existingCount)

    // Create order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.businessOrders.create({
        data: {
          businessId,
          orderNumber,
          customerId: customerId || null,
          employeeId: employee?.id || null,
          orderType: 'SALE',
          status: 'COMPLETED',
          subtotal,
          taxAmount: 0,
          discountAmount: items.reduce((sum: number, item: any) => sum + (item.discountAmount || 0), 0),
          totalAmount: subtotal,
          paymentMethod: paymentMethod || 'CASH',
          paymentStatus: 'PAID',
          businessType,
          attributes: { isManualEntry: true },
          notes: notes || 'Manual entry from book records',
          transactionDate: new Date(transactionDate + 'T12:00:00Z'),
          isManualEntry: true,
          manualEntryNote: notes || null,
          processedAt: new Date(transactionDate + 'T12:00:00Z'),
          updatedAt: new Date(),
        },
      })

      // Create order items
      for (const item of items) {
        const itemTotal = (item.quantity * item.unitPrice) - (item.discountAmount || 0)
        await tx.businessOrderItems.create({
          data: {
            orderId: newOrder.id,
            productVariantId: item.productVariantId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount || 0,
            totalPrice: itemTotal,
            attributes: { name: item.name, isManualEntry: true },
          },
        })
      }

      return newOrder
    })

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        transactionDate,
        totalAmount: Number(order.totalAmount),
        itemCount: items.length,
        isManualEntry: true,
      },
      message: `Manual order ${order.orderNumber} created for ${transactionDate}`,
    })
  } catch (error: any) {
    console.error('Error creating manual order:', error)

    // Handle unique constraint violation (duplicate order number)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate order number. Please try again.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create manual order' },
      { status: 500 }
    )
  }
}
