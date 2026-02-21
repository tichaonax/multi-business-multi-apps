import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { validatePaymentAmount, updatePayrollAccountBalance } from '@/lib/payroll-account-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/payroll/account/payments/[paymentId]
 * Get single payment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = await params

    // TODO: Add permission check for canViewPayrollHistory

    // Get payment with relations
    const payment = await prisma.payrollAccountPayments.findUnique({
      where: { id: paymentId },
      include: {
        employees: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
            nationalId: true,
          },
        },
        users_created: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: payment.id,
        employeeId: payment.employeeId,
        employee: {
          id: payment.employees.id,
          employeeNumber: payment.employees.employeeNumber,
          name:
            payment.employees.fullName ||
            `${payment.employees.firstName} ${payment.employees.lastName}`,
          nationalId: payment.employees.nationalId,
        },
        amount: Number(payment.amount),
        notes: payment.notes,
        paymentType: payment.paymentType,
        paymentDate: payment.paymentDate,
        status: payment.status,
        isAdvance: payment.isAdvance,
        isLocked: payment.isLocked,
        payrollEntryId: payment.payrollEntryId,
        createdBy: payment.users_created,
        createdAt: payment.createdAt,
      },
    })
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 })
  }
}

/**
 * PATCH /api/payroll/account/payments/[paymentId]
 * Update payment (only if not locked/signed)
 *
 * Body:
 * - amount: number (optional)
 * - adjustmentNote: string (optional, required if amount changed)
 * - paymentType: string (optional)
 * - paymentSchedule: string (optional)
 * - deductions: object (optional)
 * - commissionAmount: number (optional)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = await params

    // TODO: Add permission check for canMakePayrollPayments

    // Get existing payment
    const existingPayment = await prisma.payrollAccountPayments.findUnique({
      where: { id: paymentId },
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Check if payment is locked
    if (existingPayment.isLocked) {
      return NextResponse.json(
        {
          error: 'Cannot update locked payment',
          reason: 'Payment has been signed and cannot be modified',
        },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate amount if provided
    if (body.amount !== undefined && body.amount !== null) {
      const amountValidation = validatePaymentAmount(Number(body.amount))
      if (!amountValidation.valid) {
        return NextResponse.json(
          { error: amountValidation.error },
          { status: 400 }
        )
      }

    }

    // Build update data
    const updateData: any = { updatedAt: new Date() }

    if (body.amount !== undefined) updateData.amount = Number(body.amount)
    if (body.notes !== undefined || body.adjustmentNote !== undefined) {
      updateData.notes = body.notes ?? body.adjustmentNote ?? null
    }
    if (body.paymentType !== undefined) updateData.paymentType = body.paymentType

    // Update payment in transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedPayment = await tx.payrollAccountPayments.update({
        where: { id: paymentId },
        data: updateData,
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

      // Update payroll account balance
      const newBalance = await updatePayrollAccountBalance(
        existingPayment.payrollAccountId
      )

      return { payment: updatedPayment, newBalance }
    })

    return NextResponse.json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        id: result.payment.id,
        employeeId: result.payment.employeeId,
        employee: {
          id: result.payment.employees.id,
          employeeNumber: result.payment.employees.employeeNumber,
          name:
            result.payment.employees.fullName ||
            `${result.payment.employees.firstName} ${result.payment.employees.lastName}`,
        },
        amount: Number(result.payment.amount),
        notes: result.payment.notes,
        paymentType: result.payment.paymentType,
        status: result.payment.status,
        updatedAt: result.payment.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update payment',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/payroll/account/payments/[paymentId]
 * Delete payment (only if not locked/signed)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = await params

    // TODO: Add permission check for canMakePayrollPayments

    // Get existing payment
    const existingPayment = await prisma.payrollAccountPayments.findUnique({
      where: { id: paymentId },
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Check if payment is locked
    if (existingPayment.isLocked) {
      return NextResponse.json(
        {
          error: 'Cannot delete locked payment',
          reason: 'Payment has been signed and cannot be deleted',
        },
        { status: 403 }
      )
    }

    // Delete payment in transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete associated vouchers first (if any)
      await tx.payrollPaymentVouchers.deleteMany({
        where: { paymentId },
      })

      // Delete payment
      await tx.payrollAccountPayments.delete({
        where: { id: paymentId },
      })

      // Update payroll account balance
      await updatePayrollAccountBalance(existingPayment.payrollAccountId)
    })

    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to delete payment',
      },
      { status: 500 }
    )
  }
}
