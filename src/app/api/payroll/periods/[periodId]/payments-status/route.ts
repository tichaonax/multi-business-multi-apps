import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { computeTotalsForEntry } from '@/lib/payroll/helpers'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * GET /api/payroll/periods/[periodId]/payments-status
 * Returns payroll entries with correct gross pay and payslip nettPay when captured.
 *
 * Gross pay is computed via computeTotalsForEntry (same logic as the period page table)
 * so it matches what's displayed on screen and what was exported to the 3rd party.
 *
 * When payslips are captured, nettPay (actual take-home after all deductions) is used
 * as the disbursement amount.
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

    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      select: { id: true, businessId: true, month: true },
    })

    if (!period) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Fetch entries including their captured payslip
    const entries = await prisma.payrollEntries.findMany({
      where: { payrollPeriodId: periodId },
      select: {
        id: true,
        employeeId: true,
        employeeNumber: true,
        employeeName: true,
        nationalId: true,
        payroll_slip: {
          select: {
            id: true,
            totalEarnings: true,
            nettPay: true,
            status: true,
          },
        },
      },
      orderBy: { employeeName: 'asc' },
    })

    // Fetch payment records linked by employeeId
    const employeeIds = entries.map((e) => e.employeeId).filter(Boolean) as string[]
    const payments = employeeIds.length > 0
      ? await prisma.payrollAccountPayments.findMany({
          where: {
            employeeId: { in: employeeIds },
            isAdvance: false,
            // Exclude loan disbursements — they are not salary payments
            paymentType: { not: 'LOAN_DISBURSEMENT' },
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

    // Most recent payment per employee
    const paymentByEmployee = new Map<string, (typeof payments)[0]>()
    for (const p of payments) {
      if (!paymentByEmployee.has(p.employeeId)) {
        paymentByEmployee.set(p.employeeId, p)
      }
    }

    const slipsCaptured = entries.filter(
      (e) => e.payroll_slip && ['CAPTURED', 'DISTRIBUTED'].includes(e.payroll_slip.status)
    ).length

    // Build result — compute correct grossPay per entry (same as period page display)
    const result = await Promise.all(entries.map(async (entry) => {
      const payment = entry.employeeId ? paymentByEmployee.get(entry.employeeId) : undefined
      const slip = entry.payroll_slip
      const slipCaptured = slip ? ['CAPTURED', 'DISTRIBUTED'].includes(slip.status) : false

      // Compute correct gross using the same helper as the period page
      // This ensures the figure matches what was exported to the 3rd party
      const { grossPay } = await computeTotalsForEntry(entry.id, period.month)

      return {
        id: entry.id,
        employeeId: entry.employeeId,
        employeeNumber: entry.employeeNumber,
        employeeName: entry.employeeName,
        nationalId: entry.nationalId,
        // Correct gross pay matching the exported spreadsheet
        grossPay,
        // totalEarnings from captured payslip — use this as the payment amount when captured
        slipTotalEarnings: slipCaptured && slip?.totalEarnings != null ? Number(slip.totalEarnings) : null,
        // nettPay from captured payslip — actual take-home after all statutory deductions
        nettPay: slipCaptured && slip?.nettPay != null ? Number(slip.nettPay) : null,
        slipCaptured,
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
    }))

    return NextResponse.json({
      success: true,
      entries: result,
      slipsCaptured,
      totalEntries: entries.length,
    })
  } catch (error) {
    console.error('Error fetching payroll entries with payment status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll entries with payment status' },
      { status: 500 }
    )
  }
}
