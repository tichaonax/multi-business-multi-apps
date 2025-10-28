import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// Validation schema for refund
const RefundPaymentSchema = z.object({
  reason: z.string().min(1, 'Refund reason is required'),
  notes: z.string().optional()
})

// Generate refund receipt number
function generateRefundReceiptNumber(businessType: string, receiptCount: number): string {
  const prefix = {
    clothing: 'REF-CLO',
    hardware: 'REF-HWD',
    grocery: 'REF-GRC',
    restaurant: 'REF-RST',
    construction: 'REF-CON'
  }[businessType] || 'REF-BIZ'

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const counter = String(receiptCount + 1).padStart(6, '0')
  return `${prefix}-${date}-${counter}`
}

// POST - Refund a payment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; paymentId: string } }
) {
  try {
    const { id: laybyId, paymentId } = params
    const body = await request.json()
    const validatedData = RefundPaymentSchema.parse(body)

    // Get user ID from request
    const userId = request.headers.get('x-user-id') || 'system'

    // Fetch original payment with layby and business info
    const originalPayment = await prisma.customerLaybyPayment.findUnique({
      where: { id: paymentId },
      include: {
        layby: {
          include: {
            business: {
              select: { id: true, type: true, name: true }
            }
          }
        },
        refunds: true // Check if already refunded
      }
    })

    if (!originalPayment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Validate payment belongs to this layby
    if (originalPayment.laybyId !== laybyId) {
      return NextResponse.json(
        { error: 'Payment does not belong to this layby' },
        { status: 400 }
      )
    }

    // Check if payment is already a refund
    if (originalPayment.isRefund) {
      return NextResponse.json(
        { error: 'Cannot refund a refund payment' },
        { status: 400 }
      )
    }

    // Check if already refunded
    if (originalPayment.refunds.length > 0) {
      return NextResponse.json(
        {
          error: 'Payment has already been refunded',
          existingRefund: originalPayment.refunds[0]
        },
        { status: 400 }
      )
    }

    const layby = originalPayment.layby

    // Validate layby status - can refund from active or completed laybys
    if (layby.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot refund payment from cancelled layby. Cancellation already handles refunds.' },
        { status: 400 }
      )
    }

    // Generate refund receipt number
    const existingPaymentsCount = await prisma.customerLaybyPayment.count({
      where: { layby: { businessId: layby.businessId } }
    })
    const refundReceiptNumber = generateRefundReceiptNumber(layby.business.type, existingPaymentsCount)

    // Calculate new totals
    const refundAmount = originalPayment.amount.toNumber()
    const newTotalPaid = layby.totalPaid.toNumber() - refundAmount
    const newBalanceRemaining = layby.balanceRemaining.toNumber() + refundAmount

    // Determine new status - if was completed, revert to active
    const newStatus = layby.status === 'COMPLETED' ? 'ACTIVE' : layby.status

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create refund payment record
      const refundPayment = await tx.customerLaybyPayment.create({
        data: {
          id: randomUUID(),
          laybyId,
          receiptNumber: refundReceiptNumber,
          amount: refundAmount, // Positive amount, but marked as refund
          paymentMethod: originalPayment.paymentMethod,
          paymentReference: `REFUND-${originalPayment.receiptNumber}`,
          notes: `Refund of ${originalPayment.receiptNumber}. Reason: ${validatedData.reason}${validatedData.notes ? '. ' + validatedData.notes : ''}`,
          processedBy: userId,
          isRefund: true,
          refundedPaymentId: paymentId
        },
        include: {
          processor: {
            select: { id: true, name: true }
          },
          refundedPayment: {
            select: { id: true, receiptNumber: true, amount: true }
          }
        }
      })

      // 2. Create BusinessTransaction record for refund
      const transaction = await tx.businessTransactions.create({
        data: {
          id: randomUUID(),
          businessId: layby.businessId,
          amount: -refundAmount, // Negative for refund
          type: 'LAYBY_REFUND',
          description: `Refund for layby ${layby.laybyNumber}`,
          referenceId: laybyId,
          referenceType: 'LAYBY_REFUND',
          balanceAfter: newTotalPaid,
          createdBy: userId,
          notes: validatedData.reason,
          metadata: {
            laybyId,
            laybyNumber: layby.laybyNumber,
            refundPaymentId: refundPayment.id,
            originalPaymentId: paymentId,
            originalReceiptNumber: originalPayment.receiptNumber,
            refundReceiptNumber,
            reason: validatedData.reason
          }
        }
      })

      // 3. Update layby totals and status
      const updatedLayby = await tx.customerLayby.update({
        where: { id: laybyId },
        data: {
          totalPaid: newTotalPaid,
          balanceRemaining: newBalanceRemaining,
          status: newStatus,
          completedAt: newStatus === 'ACTIVE' ? null : layby.completedAt // Clear completion if reverting
        },
        include: {
          business: {
            select: { name: true, type: true }
          },
          customer: {
            select: { id: true, name: true, customerNumber: true }
          }
        }
      })

      return {
        refundPayment,
        transaction,
        layby: updatedLayby
      }
    })

    return NextResponse.json({
      data: {
        refund: result.refundPayment,
        layby: result.layby,
        transaction: {
          id: result.transaction.id,
          amount: result.transaction.amount
        }
      },
      message: 'Payment refunded successfully',
      refundAmount,
      newBalanceRemaining,
      statusChanged: layby.status !== newStatus
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error processing refund:', error)
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    )
  }
}
