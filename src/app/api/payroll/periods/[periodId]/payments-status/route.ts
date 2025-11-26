import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/payroll/periods/[periodId]/payments-status
 * Get payroll entries with payment status information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { periodId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = params

    // Fetch payroll period to verify access
    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      select: { id: true, businessId: true },
    })

    if (!period) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // TODO: Add permission check for viewing payroll

    // Fetch all payroll entries for this period with payment info
    const entries = await prisma.payrollEntries.findMany({
      where: { payrollPeriodId: periodId },
      select: {
        id: true,
        employeeId: true,
        employeeNumber: true,
        employeeName: true,
        nationalId: true,
        netPay: true,
        grossPay: true,
        totalDeductions: true,
      },
      orderBy: { employeeName: 'asc' },
    })

    // Fetch payment information for these entries
    const entryIds = entries.map((e) => e.id)
    const payments = await prisma.payrollPayments.findMany({
      where: {
        payrollEntryId: { in: entryIds },
        isAdvance: false, // Only regular payments, not advances
      },
      select: {
        id: true,
        payrollEntryId: true,
        amount: true,
        status: true,
        paymentDate: true,
        users_created: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create a map of entry ID to payment
    const paymentMap = new Map(
      payments.map((p) => [p.payrollEntryId, p])
    )

    // Combine entries with payment information
    const result = entries.map((entry) => {
      const payment = paymentMap.get(entry.id)
      return {
        id: entry.id,
        employeeId: entry.employeeId,
        employeeNumber: entry.employeeNumber,
        employeeName: entry.employeeName,
        nationalId: entry.nationalId,
        netPay: Number(entry.netPay || 0),
        grossPay: Number(entry.grossPay || 0),
        totalDeductions: Number(entry.totalDeductions || 0),
        payment: payment
          ? {
              id: payment.id,
              amount: Number(payment.amount),
              status: payment.status,
              paymentDate: payment.paymentDate,
              createdBy: payment.users_created,
            }
          : undefined,
      }
    })

    return NextResponse.json({
      success: true,
      entries: result,
    })
  } catch (error) {
    console.error('Error fetching payroll entries with payment status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll entries with payment status' },
      { status: 500 }
    )
  }
}
