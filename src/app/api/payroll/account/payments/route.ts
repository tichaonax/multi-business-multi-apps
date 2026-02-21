import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getGlobalPayrollAccount,
  validatePaymentAmount,
  checkPayrollAccountBalance,
  updatePayrollAccountBalance,
} from '@/lib/payroll-account-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/payroll/account/payments
 * Get list of payroll payments with pagination and filtering
 *
 * Query params:
 * - employeeId: Filter by employee (optional)
 * - startDate: Filter payments from this date (optional)
 * - endDate: Filter payments up to this date (optional)
 * - status: Filter by status (PENDING | VOUCHER_ISSUED | SIGNED | COMPLETED) (optional)
 * - paymentType: Filter by type (REGULAR_SALARY | ADVANCE | BONUS | COMMISSION) (optional)
 * - isAdvance: Filter advances only (true | false) (optional)
 * - limit: Number of payments to return (default: 20)
 * - offset: Number of payments to skip (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add permission check for canViewPayrollHistory

    // Get global payroll account
    const payrollAccount = await getGlobalPayrollAccount()
    if (!payrollAccount) {
      return NextResponse.json(
        { error: 'Payroll account not found' },
        { status: 404 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const paymentType = searchParams.get('paymentType')
    const isAdvance = searchParams.get('isAdvance')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {
      payrollAccountId: payrollAccount.id,
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    if (startDate || endDate) {
      where.paymentDate = {}
      if (startDate) {
        where.paymentDate.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.paymentDate.lt = end
      }
    }

    if (status) {
      where.status = status
    }

    if (paymentType) {
      where.paymentType = paymentType
    }

    if (isAdvance !== null && isAdvance !== undefined) {
      where.isAdvance = isAdvance === 'true'
    }

    // Get payments with pagination
    const [payments, totalCount] = await Promise.all([
      prisma.payrollAccountPayments.findMany({
        where,
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
        orderBy: { paymentDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payrollAccountPayments.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        payments: payments.map((p) => ({
          id: p.id,
          employeeId: p.employeeId,
          employee: {
            id: p.employees.id,
            employeeNumber: p.employees.employeeNumber,
            firstName: p.employees.firstName,
            lastName: p.employees.lastName,
            fullName: p.employees.fullName,
            nationalId: p.employees.nationalId,
          },
          amount: Number(p.amount),
          netAmount: p.netAmount != null ? Number(p.netAmount) : null,
          notes: p.notes,
          paymentType: p.paymentType,
          paymentDate: p.paymentDate,
          status: p.status,
          isAdvance: p.isAdvance,
          isLocked: p.isLocked,
          createdBy: p.users_created,
          createdAt: p.createdAt,
        })),
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching payroll payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll payments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payroll/account/payments
 * Create new payroll payment(s) - supports both single and batch
 *
 * Body (Single Payment):
 * - employeeId: string (required)
 * - amount: number (required)
 * - paymentType: "REGULAR_SALARY" | "ADVANCE" | "BONUS" | "COMMISSION" (required)
 * - paymentSchedule: "WEEKLY" | "BIWEEKLY" | "MONTHLY" (optional)
 * - isAdvance: boolean (optional, default: false)
 * - adjustmentNote: string (optional, required if amount adjusted)
 * - deductions: object (optional, JSON with deduction details)
 * - commissionAmount: number (optional)
 * - payrollEntryId: string (optional, link to payroll entry)
 *
 * Body (Batch Payment):
 * - payments: array of payment objects (required)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add permission check for canMakePayrollPayments

    // Get global payroll account
    const payrollAccount = await getGlobalPayrollAccount()
    if (!payrollAccount) {
      return NextResponse.json(
        { error: 'Payroll account not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Check if batch payment or single payment
    const isBatch = Array.isArray(body.payments)
    const paymentsToCreate = isBatch ? body.payments : [body]

    // Validate all payments
    for (const payment of paymentsToCreate) {
      if (!payment.employeeId) {
        return NextResponse.json(
          { error: 'Employee ID is required for each payment' },
          { status: 400 }
        )
      }

      if (payment.amount === undefined || payment.amount === null) {
        return NextResponse.json(
          { error: 'Amount is required for each payment' },
          { status: 400 }
        )
      }

      if (!payment.paymentType) {
        return NextResponse.json(
          { error: 'Payment type is required for each payment' },
          { status: 400 }
        )
      }

      // Validate amount
      const amountValidation = validatePaymentAmount(Number(payment.amount))
      if (!amountValidation.valid) {
        return NextResponse.json(
          { error: `Payment validation failed: ${amountValidation.error}` },
          { status: 400 }
        )
      }

    }

    // Calculate total payment amount
    const totalAmount = paymentsToCreate.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )

    // Check payroll account balance
    const hasSufficientBalance = await checkPayrollAccountBalance(
      payrollAccount.id,
      totalAmount
    )

    if (!hasSufficientBalance) {
      return NextResponse.json(
        {
          error: 'Insufficient balance in payroll account',
          required: totalAmount,
          available: Number(payrollAccount.balance),
        },
        { status: 400 }
      )
    }

    // Create payments in transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdPayments = []

      for (const payment of paymentsToCreate) {
        // Verify employee exists
        const employee = await tx.employees.findUnique({
          where: { id: payment.employeeId },
          select: { id: true, employeeNumber: true, fullName: true },
        })

        if (!employee) {
          throw new Error(`Employee not found: ${payment.employeeId}`)
        }

        // Create payment
        const newPayment = await tx.payrollAccountPayments.create({
          data: {
            payrollAccountId: payrollAccount.id,
            employeeId: payment.employeeId,
            payrollEntryId: payment.payrollEntryId || null,
            amount: Number(payment.amount),
            notes: payment.adjustmentNote || payment.notes || null,
            paymentType: payment.paymentType,
            isAdvance: payment.isAdvance || false,
            status: 'PENDING',
            createdBy: user.id,
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
          },
        })

        createdPayments.push(newPayment)
      }

      // Update payroll account balance
      const newBalance = await updatePayrollAccountBalance(payrollAccount.id)

      return { payments: createdPayments, newBalance }
    })

    return NextResponse.json(
      {
        success: true,
        message: isBatch
          ? `${result.payments.length} payments created successfully`
          : 'Payment created successfully',
        data: {
          payments: result.payments.map((p) => ({
            id: p.id,
            employeeId: p.employeeId,
            employee: {
              id: p.employees.id,
              employeeNumber: p.employees.employeeNumber,
              name: p.employees.fullName || `${p.employees.firstName} ${p.employees.lastName}`,
            },
            amount: Number(p.amount),
            paymentType: p.paymentType,
            paymentDate: p.paymentDate,
            status: p.status,
            isAdvance: p.isAdvance,
            createdAt: p.createdAt,
          })),
          payrollAccountBalance: result.newBalance,
          totalAmount,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating payroll payment(s):', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create payroll payment(s)',
      },
      { status: 500 }
    )
  }
}
