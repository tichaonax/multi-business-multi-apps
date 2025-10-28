import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// Validation schema for recording payment
const RecordPaymentSchema = z.object({
  amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'STORE_CREDIT', 'LAYAWAY', 'NET_30', 'CHECK']),
  paymentReference: z.string().optional(),
  notes: z.string().optional()
})

// Generate receipt number
function generateReceiptNumber(businessType: string, receiptCount: number): string {
  const prefix = {
    clothing: 'RCP-CLO',
    hardware: 'RCP-HWD',
    grocery: 'RCP-GRC',
    restaurant: 'RCP-RST',
    construction: 'RCP-CON'
  }[businessType] || 'RCP-BIZ'

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const counter = String(receiptCount + 1).padStart(6, '0')
  return `${prefix}-${date}-${counter}`
}

// GET - Fetch payment history for a layby
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    // Check if layby exists
    const layby = await prisma.customerLayby.findUnique({
      where: { id },
      select: { id: true }
    })

    if (!layby) {
      return NextResponse.json(
        { error: 'Layby not found' },
        { status: 404 }
      )
    }

    // Fetch all payments for this layby
    const payments = await prisma.customerLaybyPayment.findMany({
      where: { laybyId: id },
      include: {
        processor: {
          select: { id: true, name: true, email: true }
        },
        refundedPayment: {
          select: { id: true, receiptNumber: true, amount: true }
        }
      },
      orderBy: { paymentDate: 'desc' }
    })

    return NextResponse.json({ data: payments })
  } catch (error) {
    console.error('Error fetching payment history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}

// POST - Record a new payment
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: laybyId } = await context.params
    const body = await request.json()
    const validatedData = RecordPaymentSchema.parse(body)

    // Get user ID from request (simplified - in production, get from auth session)
    let userId = request.headers.get('x-user-id') || 'system'

    // Verify user exists, if not use the first admin user as fallback
    const userExists = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!userExists) {
      // Find first admin user as fallback
      const adminUser = await prisma.users.findFirst({
        where: { role: 'admin' },
        select: { id: true }
      })

      if (adminUser) {
        userId = adminUser.id
      } else {
        return NextResponse.json(
          { error: 'No valid user found to process payment. Please ensure you are logged in.' },
          { status: 400 }
        )
      }
    }

    // Fetch layby with business info
    const layby = await prisma.customerLayby.findUnique({
      where: { id: laybyId },
      include: {
        business: {
          select: { id: true, type: true, name: true }
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
        { error: 'Cannot record payment for completed layby' },
        { status: 400 }
      )
    }

    if (layby.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot record payment for cancelled layby' },
        { status: 400 }
      )
    }

    if (layby.status === 'ON_HOLD') {
      return NextResponse.json(
        { error: 'Cannot record payment for layby on hold. Please reactivate first.' },
        { status: 400 }
      )
    }

    // Validate payment amount doesn't exceed balance
    if (validatedData.amount > layby.balanceRemaining.toNumber()) {
      return NextResponse.json(
        {
          error: 'Payment amount exceeds balance remaining',
          balanceRemaining: layby.balanceRemaining.toNumber(),
          attemptedPayment: validatedData.amount
        },
        { status: 400 }
      )
    }

    // Generate receipt number
    const existingPaymentsCount = await prisma.customerLaybyPayment.count({
      where: { layby: { businessId: layby.businessId } }
    })
    const receiptNumber = generateReceiptNumber(layby.business.type, existingPaymentsCount)

    // Calculate new totals
    const newTotalPaid = layby.totalPaid.toNumber() + validatedData.amount
    const newBalanceRemaining = layby.balanceRemaining.toNumber() - validatedData.amount
    const isFullyPaid = newBalanceRemaining <= 0

    // Calculate next payment due date based on installment frequency
    const calculateNextPaymentDate = (currentDueDate: Date | null, frequency: string): Date | null => {
      if (!currentDueDate || isFullyPaid) return null

      const nextDate = new Date(currentDueDate)

      switch (frequency) {
        case 'WEEKLY':
          nextDate.setDate(nextDate.getDate() + 7)
          break
        case 'FORTNIGHTLY':
          nextDate.setDate(nextDate.getDate() + 14)
          break
        case 'MONTHLY':
          nextDate.setMonth(nextDate.getMonth() + 1)
          break
        case 'CUSTOM':
          // For custom, advance by 2 weeks as default
          nextDate.setDate(nextDate.getDate() + 14)
          break
        default:
          nextDate.setDate(nextDate.getDate() + 14)
      }

      return nextDate
    }

    const nextPaymentDueDate = calculateNextPaymentDate(
      layby.paymentDueDate,
      layby.installmentFrequency || 'FORTNIGHTLY'
    )

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const payment = await tx.customerLaybyPayment.create({
        data: {
          id: randomUUID(),
          laybyId,
          receiptNumber,
          amount: validatedData.amount,
          paymentMethod: validatedData.paymentMethod,
          paymentReference: validatedData.paymentReference,
          notes: validatedData.notes,
          processedBy: userId,
          isRefund: false
        },
        include: {
          processor: {
            select: { id: true, name: true }
          }
        }
      })

      // 2. Create BusinessTransaction record
      const transaction = await tx.businessTransactions.create({
        data: {
          id: randomUUID(),
          businessId: layby.businessId,
          amount: validatedData.amount,
          type: 'LAYBY_PAYMENT',
          description: `Layby payment for ${layby.laybyNumber}`,
          referenceId: laybyId,
          referenceType: 'LAYBY',
          balanceAfter: newTotalPaid,
          createdBy: userId,
          notes: validatedData.notes,
          metadata: {
            laybyId,
            laybyNumber: layby.laybyNumber,
            paymentId: payment.id,
            receiptNumber,
            paymentMethod: validatedData.paymentMethod
          }
        }
      })

      // 3. Update layby totals and status
      const updatedLayby = await tx.customerLayby.update({
        where: { id: laybyId },
        data: {
          totalPaid: newTotalPaid,
          balanceRemaining: newBalanceRemaining,
          status: isFullyPaid ? 'COMPLETED' : layby.status,
          completedAt: isFullyPaid ? new Date() : layby.completedAt,
          paymentDueDate: nextPaymentDueDate
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
        payment,
        transaction,
        layby: updatedLayby,
        isFullyPaid
      }
    })

    return NextResponse.json({
      data: {
        payment: result.payment,
        layby: result.layby,
        transaction: {
          id: result.transaction.id,
          amount: result.transaction.amount
        }
      },
      message: result.isFullyPaid
        ? 'Payment recorded successfully. Layby is now fully paid and completed!'
        : 'Payment recorded successfully',
      isFullyPaid: result.isFullyPaid,
      balanceRemaining: newBalanceRemaining
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error recording payment:', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
