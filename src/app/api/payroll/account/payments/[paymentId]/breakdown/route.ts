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
        employeeId: true,
      },
    })

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    // --- SALARY: full payslip breakdown ---
    if (payment.paymentType === 'SALARY') {
      if (!payment.payrollEntryId) {
        return NextResponse.json({ error: 'No payroll entry linked to this payment' }, { status: 400 })
      }

      const entry = await prisma.payrollEntries.findUnique({
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
      })

      // Compute live gross and deductions using the same helper as the payroll table
      const totals = await computeTotalsForEntry(payment.payrollEntryId)

      const empFromEntry = entry?.employees
      const empName = empFromEntry?.fullName
        || (empFromEntry ? `${empFromEntry.firstName} ${empFromEntry.lastName}` : null)
        || entry?.employeeName
        || 'Unknown'

      const period = entry?.payroll_periods ?? null

      // Fetch per diem — same filter as payroll table (approved + pending)
      let perDiem = 0
      if (payment.employeeId && period) {
        try {
          const perDiemRows = await prisma.perDiemEntries.groupBy({
            by: ['employeeId'],
            where: {
              employeeId: payment.employeeId,
              payrollYear: period.year,
              payrollMonth: period.month,
              approvalStatus: { in: ['approved', 'pending'] },
            },
            _sum: { amount: true },
          })
          perDiem = Number(perDiemRows[0]?._sum?.amount ?? 0)
        } catch { /* non-fatal */ }
      }

      // Statutory deductions from entry ZIMRA export fields (authoritative)
      const payeTax = Number(entry?.zimraPaye ?? entry?.payeAmount ?? 0)
      const nssaAmt = Number(entry?.zimraNssa ?? entry?.nssaEmployee ?? 0)
      const aidsLevyAmt = Number(entry?.zimraAidsLevy ?? entry?.aidsLevy ?? 0)

      // Gross matches payroll page: base gross - clock-in deduction + per diem
      const grossInclBenefits = totals.grossPay - (totals.clockInDeductionAmount || 0) + perDiem

      // Net Pay: use payment.amount as the authoritative value (corrected by recovery script,
      // matches the payroll table). This ensures the modal always agrees with what was paid.
      const netPay = Number(payment.amount)

      return NextResponse.json({
        success: true,
        data: {
          type: 'SALARY',
          employee: {
            name: empName,
            employeeNumber: empFromEntry?.employeeNumber || entry?.employeeNumber || '',
            nationalId: empFromEntry?.nationalId || entry?.nationalId || '',
          },
          period: period
            ? { year: period.year, month: period.month, label: `${MONTHS[period.month - 1]} ${period.year}` }
            : null,
          earnings: {
            baseSalary: totals.grossPay - totals.benefitsTotal - (totals.additionsTotal ?? 0) + (totals.absenceDeduction ?? 0),
            overtimePay: totals.standardOvertimePay ?? totals.overtimePay ?? 0,
            benefitsTotal: totals.benefitsTotal,
            perDiem: perDiem > 0 ? perDiem : undefined,
            grossPay: grossInclBenefits,
          },
          deductions: {
            payeTax,
            aidsLevy: aidsLevyAmt,
            nssaEmployee: nssaAmt,
            loanDeductions: Number(entry?.loanDeductions ?? 0),
            advanceDeductions: Number(entry?.advanceDeductions ?? 0),
            miscDeductions: Number(entry?.miscDeductions ?? 0),
            // Negative adjustments (e.g. penalties applied via payrollAdjustments)
            otherDeductions: totals.adjustmentsAsDeductions || 0,
            // Named benefit-type deductions (e.g. GUTU Penalty stored as benefit with entryType='deduction')
            namedDeductions: (totals.mergedBenefits || [])
              .filter((b: any) => b.isActive !== false && (b.entryType === 'deduction' || b.type === 'deduction'))
              .map((b: any) => ({ label: b.benefitName || b.name || 'Deduction', amount: Number(b.amount || 0) })),
            totalDeductions: payeTax + nssaAmt + aidsLevyAmt + totals.totalDeductions,
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
