import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'

// POST /api/payroll/entries/[entryId]/sync-clock-in
//
// Reads EmployeeAttendance records for the pay period and calculates
// a deduction based on late arrivals and early departures.
// Creates / replaces a PayrollAdjustments record flagged with
// isClockInAdjustment = true so it can be re-synced without
// duplicating entries.
//
// Returns:
//   { lateCount, earlyCount, totalLateMinutes, totalEarlyMinutes,
//     deductionAmount, hourlyRate, adjustmentId | null, summary }
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

  // Load entry + period + employee schedule
  const entry = await prisma.payrollEntries.findUnique({
    where: { id: entryId },
    include: {
      payroll_periods: { select: { id: true, year: true, month: true, status: true } },
      employees: {
        select: {
          id: true,
          scheduledStartTime: true,
          scheduledEndTime: true,
        },
      },
    },
  })

  if (!entry) return NextResponse.json({ error: 'Payroll entry not found' }, { status: 404 })

  const period = (entry as any).payroll_periods
  if (!period) return NextResponse.json({ error: 'No payroll period attached to entry' }, { status: 400 })
  if (['approved', 'closed', 'exported'].includes(period.status)) {
    return NextResponse.json({ error: 'Cannot sync clock-in for approved/closed/exported payroll' }, { status: 400 })
  }

  const employee = (entry as any).employees
  const employeeId = entry.employeeId
  if (!employeeId) return NextResponse.json({ error: 'No employeeId on entry' }, { status: 400 })

  // Date range: entire calendar month of the period
  const periodStart = new Date(period.year, period.month - 1, 1, 0, 0, 0, 0)
  const periodEnd = new Date(period.year, period.month, 0, 23, 59, 59, 999)

  // Load all attendance records for this employee in the period
  const attendanceRows = await prisma.employeeAttendance.findMany({
    where: {
      employeeId,
      date: { gte: periodStart, lte: periodEnd },
      checkIn: { not: null },
    },
    select: { date: true, checkIn: true, checkOut: true },
  })

  // Parse scheduled times (stored as "HH:MM" 24-hour strings)
  const parseHHMM = (str: string | null | undefined) => {
    if (!str) return null
    const [h, m] = str.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return null
    return { h, m }
  }
  const schedStart = parseHHMM(employee?.scheduledStartTime)
  const schedEnd = parseHHMM(employee?.scheduledEndTime)

  let lateCount = 0
  let earlyCount = 0
  let totalLateMinutes = 0
  let totalEarlyMinutes = 0

  for (const att of attendanceRows) {
    const checkIn = att.checkIn as Date | null
    const checkOut = att.checkOut as Date | null
    const baseDate = att.date as Date

    if (checkIn && schedStart) {
      const scheduled = new Date(baseDate)
      scheduled.setHours(schedStart.h, schedStart.m, 0, 0)
      const diffMs = checkIn.getTime() - scheduled.getTime()
      if (diffMs > 0) {
        lateCount++
        totalLateMinutes += Math.round(diffMs / 60000)
      }
    }

    if (checkOut && schedEnd) {
      const scheduled = new Date(baseDate)
      scheduled.setHours(schedEnd.h, schedEnd.m, 0, 0)
      const diffMs = scheduled.getTime() - checkOut.getTime()
      if (diffMs > 0) {
        earlyCount++
        totalEarlyMinutes += Math.round(diffMs / 60000)
      }
    }
  }

  // Derive hourly rate (same formula used in helpers.ts)
  const baseSalary = Number(entry.baseSalary ?? 0)
  const annualSalary = baseSalary * 12
  const hoursPerYear = 6 * 9 * 52 // 2808
  const hourlyRate = hoursPerYear > 0 ? annualSalary / hoursPerYear : 0

  const totalMinutes = totalLateMinutes + totalEarlyMinutes
  const deductionAmount = Math.round((totalMinutes / 60) * hourlyRate * 100) / 100

  // Build human-readable summary
  const parts: string[] = []
  if (lateCount > 0) parts.push(`${lateCount} late arrival${lateCount > 1 ? 's' : ''} (${totalLateMinutes} min)`)
  if (earlyCount > 0) parts.push(`${earlyCount} early departure${earlyCount > 1 ? 's' : ''} (${totalEarlyMinutes} min)`)
  const summary = parts.length > 0 ? parts.join(', ') : 'No tardiness recorded'

  // Remove any existing clock-in adjustment for this entry, then create a fresh one
  await prisma.payrollAdjustments.deleteMany({
    where: { payrollEntryId: entryId, isClockInAdjustment: true } as any,
  })

  let adjustmentId: string | null = null

  if (deductionAmount > 0) {
    const newId = `PA-${nanoid(12)}`
    await prisma.payrollAdjustments.create({
      data: {
        id: newId,
        payrollEntryId: entryId,
        adjustmentType: 'clock_in_deduction',
        amount: -deductionAmount,           // negative = deduction
        isClockInAdjustment: true,
        reason: summary,
        createdBy: user.id,
        status: 'approved',
      } as any,
    })
    adjustmentId = newId
  }

  // Recalculate entry totals
  await recalcEntry(entryId)

  return NextResponse.json({
    lateCount,
    earlyCount,
    totalLateMinutes,
    totalEarlyMinutes,
    deductionAmount,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    adjustmentId,
    summary,
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
    const amt = Number(a.amount || 0)
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

  // Update period totals
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
