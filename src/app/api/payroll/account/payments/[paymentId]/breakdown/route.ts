import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

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

      const [slip, entry] = await Promise.all([
        prisma.payrollSlips.findUnique({
          where: { payrollEntryId: payment.payrollEntryId },
          include: {
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
        prisma.payrollEntries.findUnique({
          where: { id: payment.payrollEntryId },
          select: {
            employeeName: true,
            employeeNumber: true,
            nationalId: true,
            baseSalary: true,
            commission: true,
            livingAllowance: true,
            vehicleAllowance: true,
            travelAllowance: true,
            overtimePay: true,
            benefitsTotal: true,
            grossPay: true,
            payeAmount: true,
            aidsLevy: true,
            nssaEmployee: true,
            zimraPaye: true,
            zimraAidsLevy: true,
            zimraNssa: true,
            loanDeductions: true,
            advanceDeductions: true,
            miscDeductions: true,
            totalDeductions: true,
            netPay: true,
          },
        }),
      ])

      const empFromSlip = slip?.employees
      const empName = empFromSlip
        ? (empFromSlip.fullName || `${empFromSlip.firstName} ${empFromSlip.lastName}`)
        : (entry?.employeeName || 'Unknown')

      const period = slip?.payroll_periods
        ? { year: slip.payroll_periods.year, month: slip.payroll_periods.month }
        : null

      return NextResponse.json({
        success: true,
        data: {
          type: 'SALARY',
          employee: {
            name: empName,
            employeeNumber: empFromSlip?.employeeNumber || entry?.employeeNumber || '',
            nationalId: empFromSlip?.nationalId || entry?.nationalId || '',
          },
          period: period
            ? { year: period.year, month: period.month, label: `${MONTHS[period.month - 1]} ${period.year}` }
            : null,
          earnings: {
            baseSalary: Number(entry?.baseSalary ?? 0),
            commission: Number(entry?.commission ?? 0),
            livingAllowance: Number(entry?.livingAllowance ?? 0),
            vehicleAllowance: Number(entry?.vehicleAllowance ?? 0),
            travelAllowance: Number(entry?.travelAllowance ?? 0),
            overtimePay: Number(entry?.overtimePay ?? 0),
            benefitsTotal: Number(entry?.benefitsTotal ?? 0),
            grossPay: Number(entry?.grossPay ?? 0),
          },
          deductions: {
            payeTax: Number(slip?.payeTax ?? entry?.zimraPaye ?? entry?.payeAmount ?? 0),
            aidsLevy: Number(slip?.aidsLevy ?? entry?.zimraAidsLevy ?? entry?.aidsLevy ?? 0),
            nssaEmployee: Number(slip?.nssaEmployee ?? entry?.zimraNssa ?? entry?.nssaEmployee ?? 0),
            loanDeductions: Number(slip?.loanDeductions ?? entry?.loanDeductions ?? 0),
            advanceDeductions: Number(slip?.advanceDeductions ?? entry?.advanceDeductions ?? 0),
            miscDeductions: Number(slip?.miscDeductions ?? entry?.miscDeductions ?? 0),
            totalDeductions: Number(slip?.totalDeductions ?? entry?.totalDeductions ?? 0),
          },
          netPay: Number(slip?.nettPay ?? slip?.netPayRound ?? entry?.netPay ?? payment.amount),
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
