import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

import { randomBytes } from 'crypto';
// Validation schemas
const CreateOrderItemSchema = z.object({
  productVariantId: z.string().min(1),
  quantity: z.number().min(0.001),  // Changed from int to decimal to support weight-based items
  unitPrice: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  attributes: z.record(z.string(), z.any()).optional() // Business-specific order item data
})

const CreateOrderSchema = z.object({
  businessId: z.string().min(1),
  customerId: z.string().optional(), // Legacy: BusinessCustomer ID
  divisionAccountId: z.string().optional(), // New: CustomerDivisionAccount ID
  employeeId: z.string().optional(),
  orderType: z.enum(['SALE', 'RETURN', 'EXCHANGE', 'SERVICE', 'RENTAL', 'SUBSCRIPTION']).default('SALE'),
  paymentMethod: z.enum(['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'STORE_CREDIT', 'LAYAWAY', 'NET_30', 'CHECK']).optional(),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  businessType: z.string().min(1),
  attributes: z.record(z.string(), z.any()).optional(), // Business-specific order data
  notes: z.string().optional(),
  items: z.array(CreateOrderItemSchema).min(1)
})

const UpdateOrderSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'REFUNDED', 'FAILED']).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'STORE_CREDIT', 'LAYAWAY', 'NET_30', 'CHECK']).optional(),
  notes: z.string().optional(),
  attributes: z.record(z.string(), z.any()).optional()
})

// Generate order number based on business type
function generateOrderNumber(businessType: string, orderCount: number): string {
  const prefix = {
    clothing: 'CLO',
    hardware: 'HWD',
    grocery: 'GRC',
    restaurant: 'RST',
    consulting: 'CON'
  }[businessType] || 'BIZ'

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const counter = String(orderCount + 1).padStart(4, '0')
  return `${prefix}-${date}-${counter}`
}

// GET - Fetch orders for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const customerId = searchParams.get('customerId')
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')
    const orderType = searchParams.get('orderType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeItems = searchParams.get('includeItems') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const where: any = { businessId }

    if (customerId) where.customerId = customerId
    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status as any
    if (paymentStatus) where.paymentStatus = paymentStatus as any
    if (orderType) where.orderType = orderType as any

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [orders, totalCount] = await Promise.all([
      prisma.businessOrders.findMany({
        where,
        include: {
          businesses: {
            select: { name: true, type: true }
          },
          business_customers: {
            select: { id: true, name: true, customerNumber: true }
          },
          employees: {
            select: { id: true, fullName: true, employeeNumber: true }
          },
          ...(includeItems && {
            business_order_items: {
              include: {
                product_variants: {
                  include: {
                    business_products: {
                      select: { name: true, productType: true }
                    }
                  }
                }
              }
            }
          })
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.businessOrders.count({ where })
    ])

    // Calculate summary statistics
    const summary = await prisma.businessOrders.aggregate({
      where,
      _sum: {
        totalAmount: true,
        subtotal: true,
        taxAmount: true,
        discountAmount: true
      },
      _count: true
    })

    return NextResponse.json({
      success: true,
      data: orders,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + orders.length < totalCount,
        summary: {
          totalOrders: summary._count,
          totalAmount: summary._sum.totalAmount || 0,
          totalSubtotal: summary._sum.subtotal || 0,
          totalTax: summary._sum.taxAmount || 0,
          totalDiscount: summary._sum.discountAmount || 0
        }
      }
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateOrderSchema.parse(body)

    const { items, ...orderData } = validatedData

    // Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: orderData.businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Verify customer exists if specified (supports both old and new systems)
    if (orderData.customerId) {
      const customer = await prisma.businessCustomers.findFirst({
        where: {
          id: orderData.customerId,
          businessId: orderData.businessId
        }
      })

      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found in BusinessCustomer table' },
          { status: 404 }
        )
      }
    }

    // Verify division account exists if specified (new system)
    if (orderData.divisionAccountId) {
      const divisionAccount = await prisma.customerDivisionAccount.findFirst({
        where: {
          id: orderData.divisionAccountId,
          businessId: orderData.businessId,
          isActive: true
        }
      })

      if (!divisionAccount) {
        return NextResponse.json(
          { error: 'Customer division account not found or inactive' },
          { status: 404 }
        )
      }
    }

    // Verify employee exists if specified
    if (orderData.employeeId) {
      const employee = await prisma.employees.findUnique({
        where: { id: orderData.employeeId }
      })

      if (!employee) {
        return NextResponse.json(
          { error: 'Employee not found' },
          { status: 404 }
        )
      }
    }

    // Verify all product variants exist and get their details
    const variantIds = items.map(item => item.productVariantId)
    const variants = await prisma.productVariants.findMany({
      where: {
        id: { in: variantIds },
        isActive: true,
        productId: {
          in: (await prisma.businessProducts.findMany({
            where: {
              businessId: orderData.businessId,
              isActive: true
            },
            select: { id: true }
          })).map(p => p.id)
        }
      },
      include: {
        business_products: {
          select: { name: true, productType: true, businessType: true }
        }
      }
    })

    if (variants.length !== variantIds.length) {
      const foundIds = variants.map(v => v.id)
      const missingIds = variantIds.filter(id => !foundIds.includes(id))
      return NextResponse.json(
        { error: `Product variants not found: ${missingIds.join(', ')}` },
        { status: 404 }
      )
    }

    // Check stock availability for physical products
    const stockIssues = []
    for (const item of items) {
      const variant = variants.find(v => v.id === item.productVariantId)!
      if ((variant as any).businessProducts?.productType === 'PHYSICAL' && variant.stockQuantity < item.quantity) {
        stockIssues.push({
          variantId: item.productVariantId,
          requested: item.quantity,
          available: variant.stockQuantity
        })
      }
    }

    if (stockIssues.length > 0) {
      return NextResponse.json(
        { error: 'Insufficient stock', details: stockIssues },
        { status: 409 }
      )
    }

    // Calculate totals
    let subtotal = 0
    const orderItems = items.map(item => {
      const itemTotal = (item.unitPrice * item.quantity) - item.discountAmount
      subtotal += itemTotal
      return {
        ...item,
        totalPrice: itemTotal
      }
    })

    const totalAmount = subtotal + orderData.taxAmount - orderData.discountAmount

    // Get current order count for order number generation
    const orderCount = await prisma.businessOrders.count({
      where: { businessId: orderData.businessId }
    })

    const orderNumber = generateOrderNumber(orderData.businessType, orderCount)

    // Create order with items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the order
  const order = await tx.businessOrders.create({
        data: {
          businessId: orderData.businessId,
          customerId: orderData.customerId,
          employeeId: orderData.employeeId,
          orderType: orderData.orderType,
          paymentMethod: orderData.paymentMethod,
          discountAmount: orderData.discountAmount,
          taxAmount: orderData.taxAmount,
          businessType: orderData.businessType || business.type,
          attributes: orderData.attributes,
          notes: orderData.notes,
          orderNumber,
          subtotal,
          totalAmount,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          updatedAt: new Date()
        },
          include: {
            businesses: { select: { name: true, type: true } },
            business_customers: { select: { id: true, name: true, customerNumber: true } },
            employees: { select: { id: true, fullName: true, employeeNumber: true } }
          }
      })

      // Create order items
      const createdItems = await Promise.all(
        orderItems.map(item =>
          tx.businessOrderItems.create({
            data: {
              orderId: order.id,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount,
              totalPrice: item.totalPrice,
              attributes: item.attributes
            }
          })
        )
      )

      // Update stock for physical products
      for (const item of items) {
        const variant = variants.find(v => v.id === item.productVariantId)!
        if ((variant as any).businessProducts?.productType === 'PHYSICAL') {
          await tx.product_variants.update({
            where: { id: item.productVariantId },
            data: {
              stockQuantity: {
                decrement: item.quantity
              }
            }
          })

          // Create stock movement record
          await tx.businessStockMovements.create({
            data: {
              businessId: orderData.businessId,
              productVariantId: item.productVariantId,
              movementType: 'SALE',
              quantity: -item.quantity,
              unitCost: item.unitPrice,
              reference: orderNumber,
              employeeId: orderData.employeeId,
              businessType: orderData.businessType,
              attributes: {
                orderId: order.id,
                orderType: orderData.orderType
              }
            }
          })
        }
      }

      return {
        ...order,
        items: createdItems
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Order created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update order
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = UpdateOrderSchema.parse(body)

    const { id, ...updateData } = validatedData

    // Verify order exists
    const existingOrder = await prisma.businessOrders.findUnique({
      where: { id },
      include: { business_order_items: true }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if order can be updated based on current status
    if (existingOrder.status === 'COMPLETED' && updateData.status !== 'REFUNDED') {
      return NextResponse.json(
        { error: 'Completed orders can only be refunded' },
        { status: 409 }
      )
    }

    if (existingOrder.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot update cancelled orders' },
        { status: 409 }
      )
    }

    // Handle status changes that affect inventory
    if (updateData.status === 'CANCELLED' && existingOrder.status !== 'CANCELLED') {
      // Restore inventory for cancelled orders
      await prisma.$transaction(async (tx) => {
        for (const item of existingOrder.business_order_items) {
          await tx.product_variants.update({
            where: { id: item.productVariantId },
            data: {
              stockQuantity: {
                increment: item.quantity
              }
            }
          })

          // Create stock movement record
          await tx.businessStockMovements.create({
            data: {
              businessId: existingOrder.businessId,
              productVariantId: item.productVariantId,
              movementType: 'RETURN_IN',
              quantity: item.quantity,
              reference: existingOrder.orderNumber,
              reason: 'Order cancelled',
              businessType: existingOrder.businessType,
              attributes: {
                orderId: existingOrder.id,
                originalOrderType: existingOrder.orderType
              }
            }
          })
        }
      })
    }

    // Update the order
    const order = await prisma.businessOrders.update({
      where: { id },
      data: updateData,
      include: {
        businesses: { select: { name: true, type: true } },
        business_customers: { select: { id: true, name: true, customerNumber: true } },
        employees: { select: { id: true, fullName: true, employeeNumber: true } },
        business_order_items: {
          include: {
            product_variants: {
              include: {
                business_products: {
                  select: { name: true, productType: true }
                }
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}