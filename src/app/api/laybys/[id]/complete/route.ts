import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// Validation schema for completion
const CompleteLaybySchema = z.object({
  notes: z.string().optional(),
  createOrder: z.boolean().default(false) // Whether to create a BusinessOrder
})

// POST - Complete layby and release items
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: laybyId } = await context.params
    const body = await request.json()
    const validatedData = CompleteLaybySchema.parse(body)

    // Get user ID from request
    const userId = request.headers.get('x-user-id') || 'system'

    // Fetch layby with all details
    const layby = await prisma.customerLayby.findUnique({
      where: { id: laybyId },
      include: {
        business: {
          select: { id: true, type: true, name: true }
        },
        customer: {
          select: { id: true, name: true, customerNumber: true }
        }
      }
    })

    if (!layby) {
      return NextResponse.json(
        { error: 'Layby not found' },
        { status: 404 }
      )
    }

    // Validate layby status
    if (layby.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Layby is already completed' },
        { status: 400 }
      )
    }

    if (layby.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot complete cancelled layby' },
        { status: 400 }
      )
    }

    if (layby.status === 'ON_HOLD') {
      return NextResponse.json(
        { error: 'Cannot complete layby on hold. Please reactivate first.' },
        { status: 400 }
      )
    }

    // Verify layby is fully paid
    if (layby.balanceRemaining.toNumber() > 0) {
      return NextResponse.json(
        {
          error: 'Layby is not fully paid',
          balanceRemaining: layby.balanceRemaining.toNumber(),
          totalAmount: layby.totalAmount.toNumber(),
          totalPaid: layby.totalPaid.toNumber()
        },
        { status: 400 }
      )
    }

    // Check if items already released
    if (layby.itemsReleased) {
      return NextResponse.json(
        {
          error: 'Items have already been released',
          releasedAt: layby.itemsReleasedAt,
          releasedBy: layby.itemsReleasedBy
        },
        { status: 400 }
      )
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update layby - mark as completed and items released
      const completedLayby = await tx.customerLayby.update({
        where: { id: laybyId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          itemsReleased: true,
          itemsReleasedAt: new Date(),
          itemsReleasedBy: userId,
          notes: validatedData.notes
            ? `${layby.notes || ''}\nCompletion: ${validatedData.notes}`.trim()
            : layby.notes
        },
        include: {
          business: {
            select: { name: true, type: true }
          },
          customer: {
            select: { id: true, name: true, customerNumber: true }
          },
          payments: {
            include: {
              processor: {
                select: { id: true, name: true }
              }
            },
            orderBy: { paymentDate: 'desc' }
          }
        }
      })

      let order = null

      // 2. Optionally create BusinessOrder (simplified implementation)
      if (validatedData.createOrder && layby.customerId) {
        // Parse items from JSON
        const items = layby.items as any[]

        // Generate order number
        const orderCount = await tx.businessOrders.count({
          where: { businessId: layby.businessId }
        })

        const prefix = {
          clothing: 'CLO',
          hardware: 'HWD',
          grocery: 'GRC',
          restaurant: 'RST',
          construction: 'CON'
        }[layby.business.type] || 'BIZ'

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const counter = String(orderCount + 1).padStart(4, '0')
        const orderNumber = `${prefix}-${date}-${counter}`

        // Create order
        order = await tx.businessOrders.create({
          data: {
            id: randomUUID(),
            businessId: layby.businessId,
            customerId: layby.customerId,
            orderNumber,
            businessType: layby.business.type,
            orderType: 'SALE',
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            paymentMethod: 'LAYAWAY',
            totalAmount: layby.totalAmount,
            taxAmount: 0,
            discountAmount: 0,
            netAmount: layby.totalAmount,
            createdBy: userId,
            notes: `Order created from completed layby ${layby.laybyNumber}`,
            attributes: {
              laybyId: layby.id,
              laybyNumber: layby.laybyNumber,
              completedAt: new Date().toISOString()
            }
          }
        })

        // Create order items
        for (const item of items) {
          await tx.businessOrderItems.create({
            data: {
              id: randomUUID(),
              orderId: order.id,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              discountAmount: 0,
              notes: `From layby ${layby.laybyNumber}`
            }
          })
        }
      }

      return {
        layby: completedLayby,
        order
      }
    })

    return NextResponse.json({
      data: {
        layby: result.layby,
        order: result.order
      },
      message: 'Layby completed successfully. Items released to customer.',
      orderCreated: !!result.order
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error completing layby:', error)
    return NextResponse.json(
      { error: 'Failed to complete layby' },
      { status: 500 }
    )
  }
}
