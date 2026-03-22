import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'

// POST /api/payroll/periods/[periodId]/sync-stock-shortfall
// For each payroll entry in the period, sums shortfall deductions from SIGNED_OFF
// stock-take reports where fullySignedOffAt falls within the period month.
// Creates a single 'stock_shortfall_deduction' PayrollAdjustment (negative) per entry.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(user, 'canAccessPayroll')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { periodId } = await params

  const period = await prisma.payrollPeriods.findUnique({
    where: { id: periodId },
    include: {
      payroll_entries: {
        select: { id: true, employeeId: true },
      },
    },
  })

  if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 })
  if (['approved', 'closed', 'exported'].includes(period.status)) {
    return NextResponse.json({ error: 'Cannot sync an approved/closed/exported period' }, { status: 400 })
  }

  const periodStart = new Date(period.year, period.month - 1, 1, 0, 0, 0, 0)
  const periodEnd = new Date(period.year, period.month, 0, 23, 59, 59, 999)

  let updated = 0
  let totalShortfallApplied = 0
  const errors: string[] = []

  for (const entry of period.payroll_entries) {
    if (!entry.employeeId) continue

    try {
      // Find all SIGNED_OFF reports where this employee is listed AND the sign-off
      // falls within the current payroll period month.
      const reportEmployees = await prisma.stockTakeReportEmployees.findMany({
        where: {
          employeeId: entry.employeeId,
          report: {
            status: 'SIGNED_OFF',
            fullySignedOffAt: { gte: periodStart, lte: periodEnd },
          },
        },
        include: {
          report: {
            select: { totalShortfallValue: true, employeeCount: true },
          },
        },
      })

      // Each employee's share = totalShortfallValue / employeeCount per report
      let totalDeduction = 0
      for (const re of reportEmployees) {
        const shortfall = Number(re.report.totalShortfallValue)
        const count = Math.max(1, re.report.employeeCount)
        totalDeduction += shortfall / count
      }
      totalDeduction = Math.round(totalDeduction * 100) / 100

      // Remove existing pending stock_shortfall_deduction adjustments for this entry
      await prisma.payrollAdjustments.deleteMany({
        where: {
          payrollEntryId: entry.id,
          adjustmentType: 'stock_shortfall_deduction',
          status: 'pending',
        } as any,
      })

      // Create new adjustment if deduction > 0
      if (totalDeduction > 0) {
        const reportCount = reportEmployees.length
        await prisma.payrollAdjustments.create({
          data: {
            id: `PA-${nanoid(12)}`,
            payrollEntryId: entry.id,
            adjustmentType: 'stock_shortfall_deduction',
            amount: -totalDeduction,
            reason: `Stock shortfall deduction (${reportCount} report${reportCount !== 1 ? 's' : ''})`,
            createdBy: user.id,
            status: 'pending',
          } as any,
        })
        totalShortfallApplied += totalDeduction
      }

      await recalcEntry(entry.id)
      updated++
    } catch (e: any) {
      errors.push(`Entry ${entry.id}: ${e.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    totalShortfallApplied,
    errors,
    message: `Updated ${updated} entries — total shortfall applied: $${totalShortfallApplied.toFixed(2)}${errors.length ? `, ${errors.length} error(s)` : ''}`,
  })
}

async function recalcEntry(entryId: string) {
  const entry = await prisma.payrollEntries.findUnique({
    where: { id: entryId },
    include: {
      payroll_entry_benefits: true,
      payroll_adjustments: true,
      employees: { select: { scheduledStartTime: true, scheduledEndTime: true, scheduledDaysPerWeek: true } },
    },
  })
  if (!entry) return

  const benefitsTotal = (entry.payroll_entry_benefits || [])
    .filter((b: any) => b.isActive)
    .reduce((s: number, b: any) => s + Number(b.amount), 0)

  let additionsTotal = 0
  let clockInDeductionTotal = 0
  let otherDeductionsTotal = 0
  for (const a of entry.payroll_adjustments || []) {
    const amt = Number(a.amount || 0)
    if (amt >= 0) {
      const isPendingClockIn = (a as any).isClockInAdjustment && (a as any).status === 'pending'
      if (!isPendingClockIn) additionsTotal += amt
    } else if ((a as any).isClockInAdjustment) {
      clockInDeductionTotal += Math.abs(amt)
    } else {
      otherDeductionsTotal += Math.abs(amt)
    }
  }

  const emp = (entry as any).employees
  const parseHHMM = (str: string | null | undefined) => {
    if (!str) return null
    const [h, m] = str.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return null
    return { h, m }
  }
  const schedStart = parseHHMM(emp?.scheduledStartTime)
  const schedEnd = parseHHMM(emp?.scheduledEndTime)
  let dailyHours = 9
  if (schedStart && schedEnd) {
    dailyHours = ((schedEnd.h * 60 + schedEnd.m) - (schedStart.h * 60 + schedStart.m)) / 60
  }
  const daysPerWeek = (emp?.scheduledDaysPerWeek as number | null) ?? 6.5
  const hoursPerYear = Math.max(1, dailyHours * daysPerWeek * 52)
  const annualSalary = Number(entry.baseSalary || 0) * 12
  const hourlyRate = annualSalary / hoursPerYear
  const absenceDays = Number(entry.absenceDays || 0) + Number((entry as any).absenceFraction || 0)
  const absenceDeduction = Math.round(absenceDays * dailyHours * hourlyRate * 100) / 100

  const baseSalary = Number(entry.baseSalary || 0)
  const commission = Number(entry.commission || 0)
  const overtimePay = Number(entry.overtimePay || 0)
  const grossPay = baseSalary + commission + overtimePay + benefitsTotal + additionsTotal - absenceDeduction - clockInDeductionTotal
  const totalDeductions = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + Number(entry.miscDeductions || 0) + otherDeductionsTotal
  const netPay = grossPay - totalDeductions

  await prisma.payrollEntries.update({
    where: { id: entryId },
    data: { benefitsTotal, adjustmentsTotal: additionsTotal, grossPay, netPay, totalDeductions, updatedAt: new Date() },
  })

  const updated = await prisma.payrollEntries.findUnique({ where: { id: entryId } })
  if (updated?.payrollPeriodId) {
    const allEntries = await prisma.payrollEntries.findMany({ where: { payrollPeriodId: updated.payrollPeriodId } })
    const pt = allEntries.reduce(
      (acc: any, e: any) => ({
        totalGrossPay: acc.totalGrossPay + Number(e.grossPay),
        totalDeductions: acc.totalDeductions + Number(e.totalDeductions),
        totalNetPay: acc.totalNetPay + Number(e.netPay),
      }),
      { totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 }
    )
    await prisma.payrollPeriods.update({
      where: { id: updated.payrollPeriodId },
      data: { ...pt, updatedAt: new Date() },
    })
  }
}
