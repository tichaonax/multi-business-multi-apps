import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'

// POST /api/payroll/entries/[entryId]/vacation-payout
//
// Calculates unused vacation days for a terminated employee and creates
// (or replaces) a pending PayrollAdjustments record of type 'vacation_payout'.
// Manager must approve/reject via the same endpoint as overtime credits.
//
// Returns: { unusedDays, dailyRate, payoutAmount, adjustmentId }
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(user, 'canEditPayrollEntry')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { entryId } = await params

  const entry = await prisma.payrollEntries.findUnique({
    where: { id: entryId },
    include: {
      payroll_periods: { select: { id: true, year: true, month: true, status: true } },
      employees: {
        select: {
          id: true,
          employmentStatus: true,
          annualVacationDays: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
          scheduledDaysPerWeek: true,
        },
      },
    },
  })

  if (!entry) return NextResponse.json({ error: 'Payroll entry not found' }, { status: 404 })

  const period = (entry as any).payroll_periods
  if (!period) return NextResponse.json({ error: 'No payroll period attached' }, { status: 400 })
  if (['approved', 'closed', 'exported'].includes(period.status)) {
    return NextResponse.json({ error: 'Cannot modify approved/closed/exported payroll' }, { status: 400 })
  }

  const employee = (entry as any).employees
  if (!employee) return NextResponse.json({ error: 'No employee on entry' }, { status: 400 })

  if (employee.employmentStatus !== 'terminated') {
    return NextResponse.json({ error: 'Vacation payout only applies to terminated employees' }, { status: 400 })
  }

  // Derive daily rate from schedule (same formula as sync-clock-in)
  const parseHHMM = (str: string | null | undefined) => {
    if (!str) return null
    const [h, m] = str.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return null
    return { h, m }
  }

  const schedStart = parseHHMM(employee.scheduledStartTime)
  const schedEnd   = parseHHMM(employee.scheduledEndTime)

  let dailyHours = 11 // restaurant fallback: 06:00–17:00
  if (schedStart && schedEnd) {
    dailyHours = (schedEnd.h * 60 + schedEnd.m - (schedStart.h * 60 + schedStart.m)) / 60
  }
  const daysPerWeek = (employee.scheduledDaysPerWeek as number | null) ?? 6.5
  const baseSalary  = Number(entry.baseSalary ?? 0)
  const annualSalary = baseSalary * 12
  const hoursPerYear = dailyHours * daysPerWeek * 52
  const hourlyRate   = hoursPerYear > 0 ? annualSalary / hoursPerYear : 0
  const dailyRate    = Math.round(hourlyRate * dailyHours * 100) / 100

  // Get leave balance for the payroll period's year
  const leaveBalance = await prisma.employeeLeaveBalance.findUnique({
    where: {
      employeeId_year: {
        employeeId: employee.id,
        year: period.year,
      },
    },
  })

  // Annual vacation days: prefer employee field, fall back to leave balance allocation
  const annualVacationDays = (employee.annualVacationDays as number | null)
    ?? leaveBalance?.annualLeaveDays
    ?? 14  // default

  const usedDays    = leaveBalance?.usedAnnualDays ?? 0
  const unusedDays  = Math.max(0, annualVacationDays - usedDays)
  const payoutAmount = Math.round(unusedDays * dailyRate * 100) / 100

  // Remove any existing vacation payout adjustment for this entry
  await prisma.payrollAdjustments.deleteMany({
    where: {
      payrollEntryId: entryId,
      adjustmentType: 'vacation_payout',
    } as any,
  })

  let adjustmentId: string | null = null

  if (unusedDays > 0 && payoutAmount > 0) {
    const newId = `PA-${nanoid(12)}`
    await prisma.payrollAdjustments.create({
      data: {
        id: newId,
        payrollEntryId: entryId,
        adjustmentType: 'vacation_payout',
        amount: payoutAmount,
        isClockInAdjustment: false,
        reason: `Vacation payout: ${unusedDays} unused day${unusedDays !== 1 ? 's' : ''} × $${dailyRate}/day`,
        createdBy: user.id,
        status: 'pending',
      } as any,
    })
    adjustmentId = newId
  }

  await recalcEntry(entryId)

  return NextResponse.json({
    unusedDays,
    usedDays,
    annualVacationDays,
    dailyRate,
    payoutAmount,
    adjustmentId,
  })
}

async function recalcEntry(entryId: string) {
  const entry = await prisma.payrollEntries.findUnique({
    where: { id: entryId },
    include: { payroll_entry_benefits: true, payroll_adjustments: true, payroll_periods: true },
  })
  if (!entry) return

  const benefitsTotal = (entry.payroll_entry_benefits || [])
    .filter((b: any) => b.isActive)
    .reduce((s: number, b: any) => s + Number(b.amount), 0)

  let additionsTotal = 0
  let deductionsTotal = 0
  for (const a of entry.payroll_adjustments || []) {
    if ((a as any).status === 'pending') continue
    const amt = Number((a as any).amount || 0)
    if (amt >= 0) additionsTotal += amt
    else deductionsTotal += Math.abs(amt)
  }

  const baseSalary = Number(entry.baseSalary || 0)
  const commission = Number(entry.commission || 0)
  const overtimePay = Number(entry.overtimePay || 0)
  const grossPay = baseSalary + commission + overtimePay + benefitsTotal + additionsTotal
  const advances = Number(entry.advanceDeductions || 0)
  const loans = Number(entry.loanDeductions || 0)
  const misc = Number(entry.miscDeductions || 0)
  const totalDeductions = advances + loans + misc + deductionsTotal
  const netPay = grossPay - totalDeductions

  await prisma.payrollEntries.update({
    where: { id: entryId },
    data: { benefitsTotal, adjustmentsTotal: additionsTotal, grossPay, netPay, totalDeductions, updatedAt: new Date() },
  })

  if (entry.payrollPeriodId) {
    const allEntries = await prisma.payrollEntries.findMany({ where: { payrollPeriodId: entry.payrollPeriodId } })
    const pt = allEntries.reduce(
      (acc: any, e: any) => ({
        totalGrossPay: acc.totalGrossPay + Number(e.grossPay),
        totalDeductions: acc.totalDeductions + Number(e.totalDeductions),
        totalNetPay: acc.totalNetPay + Number(e.netPay),
      }),
      { totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 }
    )
    await prisma.payrollPeriods.update({
      where: { id: entry.payrollPeriodId },
      data: { totalGrossPay: pt.totalGrossPay, totalDeductions: pt.totalDeductions, totalNetPay: pt.totalNetPay, updatedAt: new Date() },
    })
  }
}
