import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * GET /api/payroll/periods/[periodId]/payments-status
 * Get payroll entries with payment status information
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params

    // Fetch payroll period to verify access and get date range for payment lookup
    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      select: { id: true, businessId: true, periodStart: true, periodEnd: true },
    })

    if (!period) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Fetch all payroll entries for this period
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

    // Fetch payment information by employeeId (PayrollAccountPayments links by employee, not entry)
    const employeeIds = entries.map((e) => e.employeeId).filter(Boolean) as string[]
    const payments = employeeIds.length > 0
      ? await prisma.payrollAccountPayments.findMany({
          where: {
            employeeId: { in: employeeIds },
            isAdvance: false,
          },
          select: {
            id: true,
            employeeId: true,
            amount: true,
            status: true,
            paymentDate: true,
            users_created: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { paymentDate: 'desc' },
        })
      : []

    // Map most recent payment per employee
    const paymentByEmployee = new Map<string, (typeof payments)[0]>()
    for (const p of payments) {
      if (!paymentByEmployee.has(p.employeeId)) {
        paymentByEmployee.set(p.employeeId, p)
      }
    }

    // Combine entries with payment information
    const result = entries.map((entry) => {
      const payment = entry.employeeId ? paymentByEmployee.get(entry.employeeId) : undefined
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
