/**
 * Order Integration for Layby Management
 *
 * This file handles converting completed laybys to business orders.
 * Integrates with the existing order management system.
 */

import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export interface LaybyToOrderOptions {
  laybyId: string
  businessId: string
  customerId: string | null
  createOrder: boolean
  userId: string
}

export interface OrderCreationResult {
  success: boolean
  orderId?: string
  orderNumber?: string
  error?: string
  details?: Record<string, any>
}

/**
 * Convert a completed layby to a business order
 * Creates an order record with all layby items
 */
export async function convertLaybyToOrder(
  options: LaybyToOrderOptions
): Promise<OrderCreationResult> {
  const { laybyId, businessId, customerId, createOrder, userId } = options

  // If order creation is disabled, return success without creating
  if (!createOrder) {
    return {
      success: true,
      details: { message: 'Order creation skipped by user preference' }
    }
  }

  try {
    // Fetch layby details
    const layby = await prisma.customerLayby.findUnique({
      where: { id: laybyId },
      include: {
        business: {
          select: {
            name: true,
            type: true
          }
        }
      }
    })

    if (!layby) {
      return {
        success: false,
        error: 'Layby not found'
      }
    }

    // Verify layby is completed
    if (layby.status !== 'COMPLETED') {
      return {
        success: false,
        error: 'Layby must be completed before creating order'
      }
    }

    // Generate order number
    const orderCount = await prisma.businessOrders.count({
      where: { businessId }
    })
    const orderNumber = generateOrderNumber(layby.business.type, orderCount)

    // Parse layby items
    const laybyItems = layby.items as any[]

    // Create order items
    const orderItems = laybyItems.map((item, index) => ({
      id: randomUUID(),
      productVariantId: item.productVariantId,
      productName: item.productName || 'Unknown Product',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      sortOrder: index,
      attributes: item.attributes || {} // Preserve attributes including scanned barcode info
    }))

    // Calculate order totals
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const totalAmount = subtotal + (layby.totalFees?.toNumber() || 0)

    // Create the order
    const order = await prisma.businessOrders.create({
      data: {
        id: randomUUID(),
        orderNumber,
        businessId,
        customerId: customerId || undefined,
        status: 'COMPLETED', // Already paid through layby
        orderDate: new Date(),
        paymentStatus: 'PAID',
        paymentMethod: 'LAYAWAY', // Special payment method for layby orders
        items: orderItems,
        subtotal,
        totalAmount,
        notes: `Created from completed layby ${layby.laybyNumber}`,
        createdBy: userId,
        metadata: {
          laybyId: layby.id,
          laybyNumber: layby.laybyNumber,
          depositAmount: layby.depositAmount.toNumber(),
          totalPaid: layby.totalPaid.toNumber(),
          completedAt: layby.completedAt?.toISOString()
        }
      }
    })

    console.log(`[Order] Created order ${orderNumber} from layby ${layby.laybyNumber}`)

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      details: {
        totalAmount,
        itemCount: orderItems.length,
        laybyNumber: layby.laybyNumber
      }
    }
  } catch (error) {
    console.error('Order creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order'
    }
  }
}

/**
 * Generate order number with business-specific prefix
 */
function generateOrderNumber(businessType: string, orderCount: number): string {
  const prefix = {
    clothing: 'ORD-CLO',
    hardware: 'ORD-HWD',
    grocery: 'ORD-GRC',
    restaurant: 'ORD-RST',
    construction: 'ORD-CON'
  }[businessType] || 'ORD-BIZ'

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const counter = String(orderCount + 1).padStart(6, '0')
  return `${prefix}-${date}-${counter}`
}

/**
 * Get order associated with a layby
 */
export async function getLaybyOrder(laybyId: string) {
  const order = await prisma.businessOrders.findFirst({
    where: {
      metadata: {
        path: ['laybyId'],
        equals: laybyId
      }
    },
    include: {
      customer: {
        select: {
          name: true,
          customerNumber: true,
          phone: true,
          email: true
        }
      }
    }
  })

  return order
}

/**
 * Check if a layby already has an associated order
 */
export async function hasAssociatedOrder(laybyId: string): Promise<boolean> {
  const count = await prisma.businessOrders.count({
    where: {
      metadata: {
        path: ['laybyId'],
        equals: laybyId
      }
    }
  })

  return count > 0
}

/**
 * Get layby summary for order system
 * Provides order-relevant information about active laybys
 */
export async function getLaybySummaryForOrders(businessId: string) {
  const [activeLaybys, completedLaybys, totalRevenue] = await Promise.all([
    prisma.customerLayby.count({
      where: { businessId, status: 'ACTIVE' }
    }),
    prisma.customerLayby.count({
      where: { businessId, status: 'COMPLETED' }
    }),
    prisma.customerLayby.aggregate({
      where: { businessId, status: 'COMPLETED' },
      _sum: { totalPaid: true }
    })
  ])

  return {
    activeLaybys,
    completedLaybys,
    totalLaybyRevenue: totalRevenue._sum.totalPaid?.toNumber() || 0
  }
}
