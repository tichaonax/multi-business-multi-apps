import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/payroll/account/payments/[paymentId]/complete
 * Mark a payment as completed
 *
 * This endpoint:
 * 1. Verifies payment exists and is signed
 * 2. Records who completed the payment and when
 * 3. Updates status to COMPLETED
 *
 * Requirements:
 * - Payment must be signed (isLocked: true)
 * - Payment status must be SIGNED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = await params

    // TODO: Add permission check for canCompletePayments

    // Get existing payment
    const existingPayment = await prisma.payrollPayments.findUnique({
      where: { id: paymentId },
      include: {
        employees: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
          },
        },
      },
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Check if payment is signed
    if (!existingPayment.isLocked) {
      return NextResponse.json(
        {
          error: 'Payment must be signed before it can be completed',
          currentStatus: existingPayment.status,
          isLocked: existingPayment.isLocked,
        },
        { status: 400 }
      )
    }

    // Check if payment is already completed
    if (existingPayment.status === 'COMPLETED') {
      return NextResponse.json(
        {
          error: 'Payment is already completed',
          completedBy: existingPayment.completedBy,
          completedAt: existingPayment.completedAt,
        },
        { status: 400 }
      )
    }

    // Check if status allows completion (must be SIGNED)
    if (existingPayment.status !== 'SIGNED') {
      return NextResponse.json(
        {
          error: 'Payment can only be completed when status is SIGNED',
          currentStatus: existingPayment.status,
        },
        { status: 400 }
      )
    }

    // Complete the payment
    const completedPayment = await prisma.payrollPayments.update({
      where: { id: paymentId },
      data: {
        completedBy: session.user.id,
        completedAt: new Date(),
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
      include: {
        employees: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
          },
        },
        users_signed: {
          select: { id: true, name: true, email: true },
        },
        users_completed: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully',
      data: {
        id: completedPayment.id,
        employeeId: completedPayment.employeeId,
        employee: {
          id: completedPayment.employees.id,
          employeeNumber: completedPayment.employees.employeeNumber,
          name:
            completedPayment.employees.fullName ||
            `${completedPayment.employees.firstName} ${completedPayment.employees.lastName}`,
        },
        amount: Number(completedPayment.amount),
        paymentType: completedPayment.paymentType,
        status: completedPayment.status,
        isLocked: completedPayment.isLocked,
        signedBy: completedPayment.users_signed,
        signedAt: completedPayment.signedAt,
        completedBy: completedPayment.users_completed,
        completedAt: completedPayment.completedAt,
        updatedAt: completedPayment.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error completing payment:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to complete payment',
      },
      { status: 500 }
    )
  }
}
