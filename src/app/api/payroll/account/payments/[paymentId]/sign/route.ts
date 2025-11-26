import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/payroll/account/payments/[paymentId]/sign
 * Sign a payment (locks it from further edits)
 *
 * This endpoint:
 * 1. Verifies payment exists and is not already signed
 * 2. Sets isLocked to true (prevents further edits/deletes)
 * 3. Records who signed and when
 * 4. Updates status to SIGNED
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

    // Check if payment is already signed
    if (existingPayment.isLocked) {
      return NextResponse.json(
        {
          error: 'Payment is already signed',
          signedBy: existingPayment.signedBy,
          signedAt: existingPayment.signedAt,
        },
        { status: 400 }
      )
    }

    // Check if status allows signing
    // Can sign payments that are PENDING or VOUCHER_ISSUED
    const allowedStatuses = ['PENDING', 'VOUCHER_ISSUED']
    if (!allowedStatuses.includes(existingPayment.status)) {
      return NextResponse.json(
        {
          error: 'Payment cannot be signed in current status',
          currentStatus: existingPayment.status,
          allowedStatuses,
        },
        { status: 400 }
      )
    }

    // Sign the payment
    const signedPayment = await prisma.payrollPayments.update({
      where: { id: paymentId },
      data: {
        isLocked: true,
        signedBy: session.user.id,
        signedAt: new Date(),
        status: 'SIGNED',
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
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Payment signed successfully',
      data: {
        id: signedPayment.id,
        employeeId: signedPayment.employeeId,
        employee: {
          id: signedPayment.employees.id,
          employeeNumber: signedPayment.employees.employeeNumber,
          name:
            signedPayment.employees.fullName ||
            `${signedPayment.employees.firstName} ${signedPayment.employees.lastName}`,
        },
        amount: Number(signedPayment.amount),
        paymentType: signedPayment.paymentType,
        status: signedPayment.status,
        isLocked: signedPayment.isLocked,
        signedBy: signedPayment.users_signed,
        signedAt: signedPayment.signedAt,
        updatedAt: signedPayment.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error signing payment:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to sign payment',
      },
      { status: 500 }
    )
  }
}
