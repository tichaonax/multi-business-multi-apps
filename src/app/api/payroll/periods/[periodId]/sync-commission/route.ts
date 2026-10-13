import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'
import { calculateEmployeeCommission } from '@/lib/payroll/commission-calculator'

// POST /api/payroll/periods/[periodId]/sync-commission
// For each commission-eligible employee's entry in the period, recalculates
// commission from their current sales totals. This is the only way an
// already-created entry's commission changes after the fact — e.g. a sale
// recorded late, or a sale cancelled after the entry was first created
// (MBM-311: no automatic/implicit recalculation elsewhere).
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
      payroll_entries: { select: { id: true, employeeId: true } },
    },
  })

  if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 })
  if (['approved', 'closed', 'exported'].includes(period.status)) {
    return NextResponse.json({ error: 'Cannot sync an approved/closed/exported period' }, { status: 400 })
  }

  // period.periodStart/periodEnd are nullable in the schema — compute from
  // the always-present year/month instead, same as sync-stock-shortfall.
  const periodStart = new Date(period.year, period.month - 1, 1, 0, 0, 0, 0)
  const periodEnd = new Date(period.year, period.month, 0, 23, 59, 59, 999)

  let updated = 0
  let totalCommissionApplied = 0
  const errors: string[] = []

  for (const entry of period.payroll_entries) {
    if (!entry.employeeId) continue

    try {
      const employee = await prisma.employees.findUnique({
        where: { id: entry.employeeId },
        select: {
          id: true,
          primaryBusinessId: true,
          commissionEligible: true,
          commissionTier1Enabled: true,
          commissionTier1Threshold: true,
          commissionTier1Rate: true,
          commissionTier2Enabled: true,
          commissionTier2Threshold: true,
          commissionTier2Rate: true,
          commissionTier3Enabled: true,
          commissionTier3Threshold: true,
          commissionTier3Rate: true,
        },
      })
      if (!employee?.commissionEligible) continue

      const result = await calculateEmployeeCommission(employee as any, periodStart, periodEnd)

      await prisma.payrollEntries.update({
        where: { id: entry.id },
        data: { commission: result.total, commissionBreakdown: result.breakdown as any, updatedAt: new Date() },
      })

      await recalcEntry(entry.id)
      totalCommissionApplied += result.total
      updated++
    } catch (e: any) {
      errors.push(`Entry ${entry.id}: ${e.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    totalCommissionApplied,
    errors,
    message: `Updated ${updated} entries — total commission: $${totalCommissionApplied.toFixed(2)}${errors.length ? `, ${errors.length} error(s)` : ''}`,
  })
}

// Mirrors the recompute in sync-stock-shortfall/route.ts — kept local
// rather than shared since that's the established pattern for these
// period-level sync routes in this codebase.
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
