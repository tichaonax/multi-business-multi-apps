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
          scheduledDaysPerWeek: true,
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

  // Derive hourly rate from employee's actual schedule
  // Fallback to restaurant defaults if no schedule set
  const baseSalary = Number(entry.baseSalary ?? 0)
  const annualSalary = baseSalary * 12

  let dailyHours = 11 // restaurant default: 06:00–17:00
  if (schedStart && schedEnd) {
    const startMin = schedStart.h * 60 + schedStart.m
    const endMin   = schedEnd.h   * 60 + schedEnd.m
    dailyHours = (endMin - startMin) / 60
  }
  const daysPerWeek = (employee?.scheduledDaysPerWeek as number | null) ?? 6.5
  const hoursPerYear = dailyHours * daysPerWeek * 52
  const hourlyRate = hoursPerYear > 0 ? annualSalary / hoursPerYear : 0
  const dailyRate  = hourlyRate * dailyHours
  const round2 = (n: number) => Math.round(n * 100) / 100

  let lateCount = 0
  let earlyCount = 0
  let totalLateMinutes = 0
  let totalEarlyMinutes = 0
  let totalOvertimeCreditMinutes = 0 // 1–30 min past schedEnd (pending credit)
  let totalOvertimeMinutes = 0       // >30 min past schedEnd (pending 1.5× pay)

  const formatTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  const records: Array<{
    date: string
    checkIn: string | null
    checkOut: string | null
    scheduledStart: string | null
    scheduledEnd: string | null
    lateMinutes: number
    earlyMinutes: number
    overtimeCreditMinutes: number
    overtimeMinutes: number
  }> = []

  for (const att of attendanceRows) {
    const checkIn  = att.checkIn  as Date | null
    const checkOut = att.checkOut as Date | null
    // Use checkIn as base date for scheduled comparisons — more reliable than att.date
    // which can have timezone-shifted timestamps
    const baseDate = checkIn ? new Date(checkIn) : att.date as Date
    let lateMinutesForDay = 0
    let earlyMinutesForDay = 0
    let overtimeCreditForDay = 0
    let overtimeForDay = 0

    // Auto clock-out: if no checkOut, treat as clocked out at scheduled end time
    let effectiveCheckOut = checkOut
    if (!effectiveCheckOut && schedEnd && checkIn) {
      const autoOut = new Date(baseDate)
      autoOut.setHours(schedEnd.h, schedEnd.m, 0, 0)
      // Only apply auto clock-out if it's after check-in
      if (autoOut > checkIn) effectiveCheckOut = autoOut
    }

    // Late arrival: clocked in after scheduled start
    if (checkIn && schedStart) {
      const scheduled = new Date(baseDate)
      scheduled.setHours(schedStart.h, schedStart.m, 0, 0)
      const diffMs = checkIn.getTime() - scheduled.getTime()
      if (diffMs > 0) {
        lateCount++
        lateMinutesForDay = Math.round(diffMs / 60000)
        totalLateMinutes += lateMinutesForDay
      }
    }

    // Early departure OR overtime: compare effectiveCheckOut to scheduled end
    if (effectiveCheckOut && schedEnd) {
      const scheduled = new Date(baseDate)
      scheduled.setHours(schedEnd.h, schedEnd.m, 0, 0)
      const diffMs = effectiveCheckOut.getTime() - scheduled.getTime()
      if (diffMs < 0) {
        // Clocked out BEFORE scheduled end → early departure (deduction)
        earlyCount++
        earlyMinutesForDay = Math.round(Math.abs(diffMs) / 60000)
        totalEarlyMinutes += earlyMinutesForDay
      } else if (diffMs > 0 && checkOut) {
        // Only count overtime if it was a real clock-out (not auto)
        const extraMin = Math.round(diffMs / 60000)
        if (extraMin <= 30) {
          overtimeCreditForDay = extraMin
          totalOvertimeCreditMinutes += overtimeCreditForDay
        } else {
          overtimeForDay = extraMin
          totalOvertimeMinutes += overtimeForDay
        }
      }
    }

    if (lateMinutesForDay > 0 || earlyMinutesForDay > 0 || overtimeCreditForDay > 0 || overtimeForDay > 0) {
      records.push({
        date: (baseDate as Date).toISOString().split('T')[0],
        checkIn:  checkIn  ? formatTime(checkIn)  : null,
        checkOut: effectiveCheckOut ? formatTime(effectiveCheckOut) : null,
        scheduledStart: employee?.scheduledStartTime ?? null,
        scheduledEnd:   employee?.scheduledEndTime   ?? null,
        lateMinutes:          lateMinutesForDay,
        earlyMinutes:         earlyMinutesForDay,
        overtimeCreditMinutes: overtimeCreditForDay,
        overtimeMinutes:       overtimeForDay,
      })
    }
  }

  const totalTardinessMinutes = totalLateMinutes + totalEarlyMinutes
  const deductionAmount  = round2((totalTardinessMinutes / 60) * hourlyRate)
  const creditAmount     = round2((totalOvertimeCreditMinutes / 60) * hourlyRate)        // pending
  const overtimeAmount   = round2((totalOvertimeMinutes / 60) * hourlyRate * 1.5)        // pending 1.5×

  // Build human-readable summary
  const parts: string[] = []
  if (lateCount  > 0) parts.push(`${lateCount} late arrival${lateCount > 1 ? 's' : ''} (${totalLateMinutes} min)`)
  if (earlyCount > 0) parts.push(`${earlyCount} early departure${earlyCount > 1 ? 's' : ''} (${totalEarlyMinutes} min)`)
  if (totalOvertimeCreditMinutes > 0) parts.push(`overtime credit ${totalOvertimeCreditMinutes} min`)
  if (totalOvertimeMinutes > 0)       parts.push(`overtime ${totalOvertimeMinutes} min`)
  const summary = parts.length > 0 ? parts.join(', ') : 'No tardiness recorded'

  // Remove pending clock-in adjustments for this entry, then recreate (approved ones are preserved)
  await prisma.payrollAdjustments.deleteMany({
    where: { payrollEntryId: entryId, isClockInAdjustment: true, status: 'pending' } as any,
  })

  let adjustmentId: string | null = null

  // De-duplicate stale approved clock_in_deduction records: keep only the most recently updated
  // (the user's explicit override). Old auto-approved records from before the pending/approved
  // split are stale and must be cleaned up to prevent double-counting.
  const allApprovedDeductions = await (prisma.payrollAdjustments as any).findMany({
    where: { payrollEntryId: entryId, adjustmentType: 'clock_in_deduction', isClockInAdjustment: true, status: 'approved' },
    orderBy: { updatedAt: 'desc' },
  })
  if (allApprovedDeductions.length > 1) {
    const staleIds = allApprovedDeductions.slice(1).map((a: any) => a.id)
    await prisma.payrollAdjustments.deleteMany({ where: { id: { in: staleIds } } })
  }
  const existingApprovedDeduction = allApprovedDeductions.length > 0 ? allApprovedDeductions[0] : null

  if (deductionAmount > 0 && !existingApprovedDeduction) {
    const newId = `PA-${nanoid(12)}`
    await prisma.payrollAdjustments.create({
      data: {
        id: newId,
        payrollEntryId: entryId,
        adjustmentType: 'clock_in_deduction',
        amount: -deductionAmount,
        isClockInAdjustment: true,
        reason: `Clock-in deduction: ${parts.filter(p => !p.includes('overtime')).join(', ') || 'No tardiness'}`,
        createdBy: user.id,
        status: 'pending',
      } as any,
    })
    adjustmentId = newId
  }

  // Create overtime credit adjustment (pending — manager must approve)
  // Skip if an approved overtime_credit adjustment already exists
  const existingApprovedCredit = await prisma.payrollAdjustments.findFirst({
    where: { payrollEntryId: entryId, adjustmentType: 'overtime_credit', isClockInAdjustment: true, status: 'approved' } as any,
  })
  if (creditAmount > 0 && !existingApprovedCredit) {
    await prisma.payrollAdjustments.create({
      data: {
        id: `PA-${nanoid(12)}`,
        payrollEntryId: entryId,
        adjustmentType: 'overtime_credit',
        amount: creditAmount,
        isClockInAdjustment: true,
        reason: `Overtime credit: ${totalOvertimeCreditMinutes} min (≤30 min grace window)`,
        createdBy: user.id,
        status: 'pending',
      } as any,
    })
  }

  // Create overtime adjustment (pending — manager must approve, 1.5× rate)
  const existingApprovedOvertime = await prisma.payrollAdjustments.findFirst({
    where: { payrollEntryId: entryId, adjustmentType: 'overtime', isClockInAdjustment: true, status: 'approved' } as any,
  })
  if (overtimeAmount > 0 && !existingApprovedOvertime) {
    await prisma.payrollAdjustments.create({
      data: {
        id: `PA-${nanoid(12)}`,
        payrollEntryId: entryId,
        adjustmentType: 'overtime',
        amount: overtimeAmount,
        isClockInAdjustment: true,
        reason: `Overtime: ${totalOvertimeMinutes} min at 1.5× rate`,
        createdBy: user.id,
        status: 'pending',
      } as any,
    })
  }

  // Recalculate entry totals
  await recalcEntry(entryId)

  return NextResponse.json({
    lateCount,
    earlyCount,
    totalLateMinutes,
    totalEarlyMinutes,
    totalOvertimeCreditMinutes,
    totalOvertimeMinutes,
    deductionAmount,
    creditAmount,
    overtimeAmount,
    hourlyRate: round2(hourlyRate),
    dailyRate:  round2(dailyRate),
    hoursPerYear: round2(hoursPerYear),
    adjustmentId,
    summary,
    records,
  })
}

function parseHHMMLocal(str: string | null | undefined) {
  if (!str) return null
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return { h, m }
}

async function recalcEntry(entryId: string) {
  const entry = await prisma.payrollEntries.findUnique({
    where: { id: entryId },
    include: {
      payroll_entry_benefits: true,
      payroll_adjustments: true,
      payroll_periods: true,
      employees: { select: { scheduledStartTime: true, scheduledEndTime: true, scheduledDaysPerWeek: true } },
    },
  })
  if (!entry) return

  const benefitsTotal = (entry.payroll_entry_benefits || [])
    .filter((b: any) => b.isActive)
    .reduce((s: number, b: any) => s + Number(b.amount), 0)

  let additionsTotal = 0
  let clockInDeductionTotal = 0  // pre-tax: clock-in tardiness
  let otherDeductionsTotal = 0   // post-tax: other negative adjustments
  for (const a of entry.payroll_adjustments || []) {
    const amt = Number(a.amount || 0)
    if (amt >= 0) {
      // Pending clock-in additions (overtime awaiting approval) are not included in gross pay
      const isPendingClockIn = (a as any).isClockInAdjustment && (a as any).status === 'pending'
      if (!isPendingClockIn) additionsTotal += amt
    }
    else if ((a as any).isClockInAdjustment) clockInDeductionTotal += Math.abs(amt)
    else otherDeductionsTotal += Math.abs(amt)
  }

  // Compute absence deduction using employee schedule (same formula as clock-in sync)
  const emp = (entry as any).employees
  const schedStart = parseHHMMLocal(emp?.scheduledStartTime)
  const schedEnd   = parseHHMMLocal(emp?.scheduledEndTime)
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
  // grossPay = Net Gross: true gross minus pre-tax deductions (absence + clock-in tardiness)
  const grossPay = baseSalary + commission + overtimePay + benefitsTotal + additionsTotal - absenceDeduction - clockInDeductionTotal
  const advances = Number(entry.advanceDeductions || 0)
  const loans = Number(entry.loanDeductions || 0)
  const misc = Number(entry.miscDeductions || 0)
  // totalDeductions = post-tax only (loans, advances, misc, other adjustments)
  const totalDeductions = advances + loans + misc + otherDeductionsTotal
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
