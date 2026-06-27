import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { computeTotalsForEntry } from '@/lib/payroll/helpers'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { paymentId } = await params

    const payment = await prisma.payrollAccountPayments.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        paymentType: true,
        payrollEntryId: true,
        payrollPeriodId: true,
        amount: true,
      },
    })

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    // --- SALARY: full payslip breakdown ---
    if (payment.paymentType === 'SALARY') {
      if (!payment.payrollEntryId) {
        return NextResponse.json({ error: 'No payroll entry linked to this payment' }, { status: 400 })
      }

      const [entry, slip] = await Promise.all([
        prisma.payrollEntries.findUnique({
          where: { id: payment.payrollEntryId },
          select: {
            employeeName: true,
            employeeNumber: true,
            nationalId: true,
            commission: true,
            zimraPaye: true,
            zimraNssa: true,
            zimraAidsLevy: true,
            payeAmount: true,
            nssaEmployee: true,
            aidsLevy: true,
            loanDeductions: true,
            advanceDeductions: true,
            miscDeductions: true,
            payroll_periods: {
              select: { year: true, month: true },
            },
            employees: {
              select: {
                employeeNumber: true,
                fullName: true,
                firstName: true,
                lastName: true,
                nationalId: true,
              },
            },
          },
        }),
        prisma.payrollSlips.findUnique({
          where: { payrollEntryId: payment.payrollEntryId },
          select: {
            nettPay: true,
            payeTax: true,
            nssaEmployee: true,
            aidsLevy: true,
            loanDeductions: true,
            advanceDeductions: true,
            miscDeductions: true,
            totalDeductions: true,
            employees: {
              select: {
                employeeNumber: true,
                fullName: true,
                firstName: true,
                lastName: true,
                nationalId: true,
              },
            },
            payroll_periods: {
              select: { year: true, month: true },
            },
          },
        }),
      ])

      // Compute live gross and deductions using the same helper as the payroll table
      const totals = await computeTotalsForEntry(payment.payrollEntryId)

      const empFromSlip = slip?.employees
      const empFromEntry = entry?.employees
      const empName = empFromSlip?.fullName
        || (empFromSlip ? `${empFromSlip.firstName} ${empFromSlip.lastName}` : null)
        || empFromEntry?.fullName
        || (empFromEntry ? `${empFromEntry.firstName} ${empFromEntry.lastName}` : null)
        || entry?.employeeName
        || 'Unknown'

      const period = slip?.payroll_periods ?? entry?.payroll_periods ?? null

      // Use stored statutory deductions (from ZIMRA export or payslip capture if available)
      const payeTax = Number(slip?.payeTax ?? entry?.zimraPaye ?? entry?.payeAmount ?? 0)
      const nssaAmt = Number(slip?.nssaEmployee ?? entry?.zimraNssa ?? entry?.nssaEmployee ?? 0)
      const aidsLevyAmt = Number(slip?.aidsLevy ?? entry?.zimraAidsLevy ?? entry?.aidsLevy ?? 0)

      // Live gross from computeTotalsForEntry (same as payroll table display)
      const grossPay = totals.grossPay
      // Live manual deductions (advances, loans, misc, benefit-type deductions)
      const manualDeductions = totals.totalDeductions

      // Net = gross - statutory - manual deductions (matches payroll table NET PAY column)
      // If the payslip has a captured nettPay and it's plausible, prefer it as it went through the full calculation
      const computedNet = Math.max(0, grossPay - payeTax - nssaAmt - aidsLevyAmt - manualDeductions)
      const netPay = slip?.nettPay != null && Number(slip.nettPay) > 0
        ? Number(slip.nettPay)
        : computedNet

      return NextResponse.json({
        success: true,
        data: {
          type: 'SALARY',
          employee: {
            name: empName,
            employeeNumber: empFromSlip?.employeeNumber || empFromEntry?.employeeNumber || entry?.employeeNumber || '',
            nationalId: empFromSlip?.nationalId || empFromEntry?.nationalId || entry?.nationalId || '',
          },
          period: period
            ? { year: period.year, month: period.month, label: `${MONTHS[period.month - 1]} ${period.year}` }
            : null,
          earnings: {
            baseSalary: totals.grossPay - totals.benefitsTotal - (totals.additionsTotal ?? 0) + (totals.absenceDeduction ?? 0),
            overtimePay: totals.standardOvertimePay ?? totals.overtimePay ?? 0,
            benefitsTotal: totals.benefitsTotal,
            grossPay,
          },
          deductions: {
            payeTax,
            aidsLevy: aidsLevyAmt,
            nssaEmployee: nssaAmt,
            loanDeductions: Number(slip?.loanDeductions ?? entry?.loanDeductions ?? 0),
            advanceDeductions: Number(slip?.advanceDeductions ?? entry?.advanceDeductions ?? 0),
            miscDeductions: Number(slip?.miscDeductions ?? entry?.miscDeductions ?? 0),
            totalDeductions: payeTax + nssaAmt + aidsLevyAmt + manualDeductions,
          },
          netPay,
        },
      })
    }

    // --- ZIMRA_PAYE / NSSA / AIDS_LEVY: per-employee breakdown for the period ---
    if (['ZIMRA_PAYE', 'NSSA', 'AIDS_LEVY'].includes(payment.paymentType)) {
      if (!payment.payrollPeriodId) {
        return NextResponse.json({ error: 'No payroll period linked to this payment' }, { status: 400 })
      }

      const [period, entries] = await Promise.all([
        prisma.payrollPeriods.findUnique({
          where: { id: payment.payrollPeriodId },
          select: { year: true, month: true },
        }),
        prisma.payrollEntries.findMany({
          where: { payrollPeriodId: payment.payrollPeriodId },
          select: {
            employeeName: true,
            employeeNumber: true,
            payeAmount: true,
            zimraPaye: true,
            aidsLevy: true,
            zimraAidsLevy: true,
            nssaEmployee: true,
            zimraNssa: true,
          },
          orderBy: { employeeName: 'asc' },
        }),
      ])

      const rows = entries.map((e) => {
        let amount = 0
        if (payment.paymentType === 'ZIMRA_PAYE') {
          amount = Number(e.zimraPaye ?? e.payeAmount ?? 0)
        } else if (payment.paymentType === 'NSSA') {
          amount = Number(e.zimraNssa ?? e.nssaEmployee ?? 0)
        } else {
          amount = Number(e.zimraAidsLevy ?? e.aidsLevy ?? 0)
        }
        return {
          employeeName: e.employeeName || 'Unknown',
          employeeNumber: e.employeeNumber || '',
          amount,
        }
      }).filter((r) => r.amount > 0)

      return NextResponse.json({
        success: true,
        data: {
          type: payment.paymentType,
          period: period
            ? { year: period.year, month: period.month, label: `${MONTHS[period.month - 1]} ${period.year}` }
            : null,
          total: Number(payment.amount),
          rows,
        },
      })
    }

    return NextResponse.json(
      { error: 'Breakdown not available for this payment type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error fetching payment breakdown:', error)
    return NextResponse.json({ error: 'Failed to fetch breakdown' }, { status: 500 })
  }
}
