import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  validatePaymentAmount,
  validatePaymentEdit,
  updateExpenseAccountBalanceTx,
  isWithinEditWindow,
} from '@/lib/expense-account-utils'
import { validatePayee } from '@/lib/payee-utils'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/[accountId]/payments/[paymentId]
 * Get single payment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount) {
      return NextResponse.json(
        { error: 'You do not have permission to access expense accounts' },
        { status: 403 }
      )
    }

    const { accountId, paymentId } = await params

    // Get payment with relations
    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      include: {
        expenseAccount: {
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
          },
        },
        payeeUser: {
          select: { id: true, name: true, email: true },
        },
        payeeEmployee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
            nationalId: true,
          },
        },
        payeePerson: {
          select: {
            id: true,
            fullName: true,
            nationalId: true,
            phone: true,
            email: true,
          },
        },
        payeeBusiness: {
          select: { id: true, name: true, type: true, description: true },
        },
        category: {
          select: { id: true, name: true, emoji: true, color: true },
        },
        subcategory: {
          select: { id: true, name: true, emoji: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        submitter: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify payment belongs to the specified account
    if (payment.expenseAccountId !== accountId) {
      return NextResponse.json(
        { error: 'Payment does not belong to this expense account' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          expenseAccount: payment.expenseAccount,
          payeeType: payment.payeeType,
          payeeUser: payment.payeeUser,
          payeeEmployee: payment.payeeEmployee,
          payeePerson: payment.payeePerson,
          payeeBusiness: payment.payeeBusiness,
          category: payment.category,
          subcategory: payment.subcategory,
          amount: Number(payment.amount),
          paymentDate: payment.paymentDate.toISOString(),
          notes: payment.notes,
          receiptNumber: payment.receiptNumber,
          receiptServiceProvider: payment.receiptServiceProvider,
          receiptReason: payment.receiptReason,
          isFullPayment: payment.isFullPayment,
          batchId: payment.batchId,
          status: payment.status,
          createdBy: payment.creator,
          submittedBy: payment.submitter,
          submittedAt: payment.submittedAt?.toISOString(),
          createdAt: payment.createdAt.toISOString(),
          updatedAt: payment.updatedAt.toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 })
  }
}

/**
 * PATCH /api/expense-account/[accountId]/payments/[paymentId]
 * Update payment (only if status is DRAFT)
 *
 * Body:
 * - amount: number (optional)
 * - notes: string (optional)
 * - categoryId: string (optional)
 * - subcategoryId: string (optional)
 * - paymentDate: string ISO date (optional)
 * - receiptNumber: string (optional)
 * - receiptServiceProvider: string (optional)
 * - receiptReason: string (optional)
 * - isFullPayment: boolean (optional)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(user)
    const isAdmin = isSystemAdmin(user)

    if (!permissions.canEditExpenseTransactions) {
      return NextResponse.json(
        { error: 'You do not have permission to edit expense transactions' },
        { status: 403 }
      )
    }

    const { accountId, paymentId } = await params

    // Get existing payment
    const existingPayment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      include: {
        expenseAccount: {
          select: { balance: true },
        },
      },
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify payment belongs to the specified account
    if (existingPayment.expenseAccountId !== accountId) {
      return NextResponse.json(
        { error: 'Payment does not belong to this expense account' },
        { status: 400 }
      )
    }

    // Check if within edit window (5 days for non-admins)
    const editWindowCheck = isWithinEditWindow(existingPayment.createdAt, isAdmin)
    if (!editWindowCheck.allowed) {
      return NextResponse.json(
        { error: editWindowCheck.error },
        { status: 403 }
      )
    }

    // Note: We now allow editing submitted payments with proper validation
    // to prevent negative balances

    // Parse request body
    const body = await request.json()
    const {
      amount,
      notes,
      categoryId,
      subcategoryId,
      paymentDate,
      receiptNumber,
      receiptServiceProvider,
      receiptReason,
      isFullPayment,
    } = body

    // Build update data
    const updateData: any = {}

    // Validate and update amount if provided
    if (amount !== undefined) {
      const amountValidation = validatePaymentAmount(Number(amount))
      if (!amountValidation.valid) {
        return NextResponse.json(
          { error: amountValidation.error },
          { status: 400 }
        )
      }

      // Validate that this change won't cause negative balances
      const editValidation = await validatePaymentEdit(
        paymentId,
        accountId,
        Number(amount)
      )
      if (!editValidation.valid) {
        return NextResponse.json(
          { error: editValidation.error },
          { status: 400 }
        )
      }

      updateData.amount = Number(amount)
    }

    // Validate and update category if provided
    if (categoryId !== undefined) {
      const category = await prisma.expenseCategories.findUnique({
        where: { id: categoryId },
      })
      if (!category) {
        return NextResponse.json(
          { error: 'Expense category not found' },
          { status: 404 }
        )
      }
      updateData.categoryId = categoryId
    }

    // Validate and update subcategory if provided
    if (subcategoryId !== undefined) {
      if (subcategoryId) {
        const subcategory = await prisma.expenseSubcategories.findUnique({
          where: { id: subcategoryId },
        })
        if (!subcategory) {
          return NextResponse.json(
            { error: 'Expense subcategory not found' },
            { status: 404 }
          )
        }
      }
      updateData.subcategoryId = subcategoryId || null
    }

    // Validate and update payment date if provided
    if (paymentDate !== undefined) {
      const payDate = new Date(paymentDate)
      if (payDate > new Date()) {
        return NextResponse.json(
          { error: 'Payment date cannot be in the future' },
          { status: 400 }
        )
      }
      updateData.paymentDate = payDate
    }

    // Update other fields
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (receiptNumber !== undefined) updateData.receiptNumber = receiptNumber?.trim() || null
    if (receiptServiceProvider !== undefined)
      updateData.receiptServiceProvider = receiptServiceProvider?.trim() || null
    if (receiptReason !== undefined) updateData.receiptReason = receiptReason?.trim() || null
    if (isFullPayment !== undefined) updateData.isFullPayment = isFullPayment

    // Use transaction to update payment and recalculate balance
    const result = await prisma.$transaction(async (tx) => {
      // Update payment
      const updatedPayment = await tx.expenseAccountPayments.update({
        where: { id: paymentId },
        data: updateData,
        include: {
          payeeUser: {
            select: { id: true, name: true, email: true },
          },
          payeeEmployee: {
            select: {
              id: true,
              employeeNumber: true,
              fullName: true,
            },
          },
          payeePerson: {
            select: {
              id: true,
              fullName: true,
              nationalId: true,
            },
          },
          payeeBusiness: {
            select: { id: true, name: true, type: true },
          },
          category: {
            select: { id: true, name: true, emoji: true },
          },
          subcategory: {
            select: { id: true, name: true, emoji: true },
          },
        },
      })

      // Recalculate and update account balance
      const newBalance = await updateExpenseAccountBalanceTx(tx, accountId)

      return { updatedPayment, newBalance }
    })

    return NextResponse.json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        payment: {
          id: result.updatedPayment.id,
          expenseAccountId: result.updatedPayment.expenseAccountId,
          payeeType: result.updatedPayment.payeeType,
          payeeUser: result.updatedPayment.payeeUser,
          payeeEmployee: result.updatedPayment.payeeEmployee,
          payeePerson: result.updatedPayment.payeePerson,
          payeeBusiness: result.updatedPayment.payeeBusiness,
          category: result.updatedPayment.category,
          subcategory: result.updatedPayment.subcategory,
          amount: Number(result.updatedPayment.amount),
          paymentDate: result.updatedPayment.paymentDate.toISOString(),
          notes: result.updatedPayment.notes,
          receiptNumber: result.updatedPayment.receiptNumber,
          status: result.updatedPayment.status,
          createdAt: result.updatedPayment.createdAt.toISOString(),
          updatedAt: result.updatedPayment.updatedAt.toISOString(),
        },
        expenseAccountBalance: result.newBalance,
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
 * DELETE /api/expense-account/[accountId]/payments/[paymentId]
 * Delete payment (only if status is DRAFT)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(user)
    if (!permissions.canAdjustExpensePayments) {
      return NextResponse.json(
        { error: 'You do not have permission to delete expense payments' },
        { status: 403 }
      )
    }

    const { accountId, paymentId } = await params

    // Get existing payment
    const existingPayment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify payment belongs to the specified account
    if (existingPayment.expenseAccountId !== accountId) {
      return NextResponse.json(
        { error: 'Payment does not belong to this expense account' },
        { status: 400 }
      )
    }

    // Check if payment is DRAFT (only DRAFT payments can be deleted)
    if (existingPayment.status !== 'DRAFT') {
      return NextResponse.json(
        {
          error: 'Cannot delete submitted payment',
          reason: 'Only DRAFT payments can be deleted. Submitted payments are immutable for audit trail.',
        },
        { status: 403 }
      )
    }

    // Delete payment in transaction and update balance
    await prisma.$transaction(async (tx) => {
      // Delete the payment
      await tx.expenseAccountPayments.delete({
        where: { id: paymentId },
      })

      // Update expense account balance (not necessary for DRAFT, but good practice)
      await updateExpenseAccountBalance(accountId)
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
