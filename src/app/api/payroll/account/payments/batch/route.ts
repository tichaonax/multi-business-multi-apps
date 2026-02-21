import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getGlobalPayrollAccount,
  checkPayrollAccountBalance,
} from '@/lib/payroll-account-utils'
import { createPaymentVoucher } from '@/lib/payroll-voucher-generator'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/payroll/account/payments/batch
 * Create multiple payroll payments in a batch
 *
 * Body:
 * - periodId: string (required)
 * - payments: Array<{
 *     payrollEntryId: string,
 *     employeeId: string,
 *     amount: number,
 *     adjustmentNote?: string
 *   }> (required)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add permission check for creating payroll payments

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
    const { periodId, payments } = body

    // Validate required fields
    if (!periodId) {
      return NextResponse.json(
        { error: 'Period ID is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: 'Payments array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Validate each payment
    for (const payment of payments) {
      if (!payment.payrollEntryId || !payment.employeeId) {
        return NextResponse.json(
          { error: 'Each payment must have payrollEntryId and employeeId' },
          { status: 400 }
        )
      }

      if (!payment.amount || payment.amount <= 0) {
        return NextResponse.json(
          { error: 'Each payment must have a valid amount greater than 0' },
          { status: 400 }
        )
      }
    }

    // Calculate total amount
    const totalAmount = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )

    // Check if payroll account has sufficient balance
    const hasSufficientBalance = await checkPayrollAccountBalance(
      payrollAccount.id,
      totalAmount
    )

    if (!hasSufficientBalance) {
      return NextResponse.json(
        {
          error: `Insufficient balance in payroll account. Total required: $${totalAmount.toFixed(
            2
          )}, Available: $${Number(payrollAccount.balance).toFixed(2)}`,
        },
        { status: 400 }
      )
    }

    // Verify period exists
    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      select: { id: true, status: true },
    })

    if (!period) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Check if entries already have salary payments
    const entryIds = payments.map((p) => p.payrollEntryId)
    const existingPayments = await prisma.payrollAccountPayments.findMany({
      where: {
        payrollEntryId: { in: entryIds },
        paymentType: 'SALARY',
        isAdvance: false,
      },
      select: { payrollEntryId: true },
    })

    if (existingPayments.length > 0) {
      return NextResponse.json(
        {
          error: `Some employees have already been paid. Please refresh and try again.`,
        },
        { status: 400 }
      )
    }

    // Create payments in transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdPayments = []

      for (const payment of payments) {
        const paymentRecord = await tx.payrollAccountPayments.create({
          data: {
            payrollAccountId: payrollAccount.id,
            employeeId: payment.employeeId,
            payrollEntryId: payment.payrollEntryId,
            amount: Number(payment.amount),
            netAmount: payment.netAmount != null ? Number(payment.netAmount) : null,
            notes: payment.adjustmentNote || null,
            paymentType: 'SALARY',
            status: 'PENDING',
            isAdvance: false,
            createdBy: user.id,
          },
        })

        createdPayments.push(paymentRecord)
      }

      // Update payroll account balance
      const paymentsSum = await tx.payrollAccountPayments.aggregate({
        where: { payrollAccountId: payrollAccount.id },
        _sum: { amount: true },
      })

      const depositsSum = await tx.payrollAccountDeposits.aggregate({
        where: { payrollAccountId: payrollAccount.id },
        _sum: { amount: true },
      })

      const totalDeposits = Number(depositsSum._sum.amount || 0)
      const totalPayments = Number(paymentsSum._sum.amount || 0)
      const newBalance = totalDeposits - totalPayments

      await tx.payrollAccounts.update({
        where: { id: payrollAccount.id },
        data: { balance: newBalance, updatedAt: new Date() },
      })

      return { createdPayments, newBalance }
    })

    // Generate vouchers for all payments (after transaction completes)
    const voucherResults = []
    for (const payment of result.createdPayments) {
      try {
        const voucher = await createPaymentVoucher(payment.id)
        voucherResults.push({
          paymentId: payment.id,
          voucherNumber: voucher.voucherNumber,
          success: true,
        })
      } catch (error) {
        console.error(`Failed to create voucher for payment ${payment.id}:`, error)
        voucherResults.push({
          paymentId: payment.id,
          error: error instanceof Error ? error.message : 'Failed to create voucher',
          success: false,
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully created ${result.createdPayments.length} payment(s) and ${voucherResults.filter(v => v.success).length} voucher(s)`,
        count: result.createdPayments.length,
        newBalance: result.newBalance,
        payments: result.createdPayments.map((p) => ({
          id: p.id,
          employeeId: p.employeeId,
          payrollEntryId: p.payrollEntryId,
          amount: Number(p.amount),
          status: p.status,
        })),
        vouchers: voucherResults,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating batch payments:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create batch payments',
      },
      { status: 500 }
    )
  }
}
