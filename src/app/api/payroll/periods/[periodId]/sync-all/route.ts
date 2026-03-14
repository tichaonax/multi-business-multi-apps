import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'

// POST /api/payroll/periods/[periodId]/sync-all
// Syncs absences + clock-in deductions for every entry in the period.
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
        include: {
          employees: {
            select: {
              id: true,
              scheduledStartTime: true,
              scheduledEndTime: true,
              scheduledDaysPerWeek: true,
            },
          },
          payroll_entry_benefits: true,
          payroll_adjustments: true,
        },
      },
    },
  })

  if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 })
  if (['approved', 'closed', 'exported'].includes(period.status)) {
    return NextResponse.json({ error: 'Cannot sync an approved/closed/exported period' }, { status: 400 })
  }

  const periodStart = new Date(period.year, period.month - 1, 1, 0, 0, 0, 0)
  const periodEnd = new Date(period.year, period.month, 0, 23, 59, 59, 999)

  let absenceUpdates = 0
  let clockInUpdates = 0
  const errors: string[] = []

  for (const entry of period.payroll_entries) {
    if (!entry.employeeId) continue

    // ── Absence sync ──────────────────────────────────────────────────────────
    try {
      const absenceCount = await prisma.employeeAbsences.count({
        where: {
          employeeId: entry.employeeId,
          date: { gte: periodStart, lte: periodEnd },
        },
      })

      const currentAbsenceDays = Number(entry.absenceDays ?? 0)
      const currentFromRecords = Number((entry as any).absenceDaysFromRecords ?? 0)
      // Update absenceDays if: never synced before (currentFromRecords === 0, so no manual override exists)
      // OR the value still matches the last synced count (meaning no manual override)
      const shouldUpdateAbsenceDays = currentFromRecords === 0 || currentAbsenceDays === currentFromRecords

      await prisma.payrollEntries.update({
        where: { id: entry.id },
        data: {
          absenceDaysFromRecords: absenceCount,
          ...(shouldUpdateAbsenceDays ? { absenceDays: absenceCount } : {}),
          updatedAt: new Date(),
        },
      })
      absenceUpdates++
    } catch (e: any) {
      errors.push(`Absence sync failed for entry ${entry.id}: ${e.message}`)
    }

    // ── Clock-in sync ─────────────────────────────────────────────────────────
    try {
      const employee = (entry as any).employees
      const attendanceRows = await prisma.employeeAttendance.findMany({
        where: {
          employeeId: entry.employeeId,
          date: { gte: periodStart, lte: periodEnd },
          checkIn: { not: null },
        },
        select: { date: true, checkIn: true, checkOut: true },
      })

      const parseHHMM = (str: string | null | undefined) => {
        if (!str) return null
        const [h, m] = str.split(':').map(Number)
        if (isNaN(h) || isNaN(m)) return null
        return { h, m }
      }

      const schedStart = parseHHMM(employee?.scheduledStartTime)
      const schedEnd = parseHHMM(employee?.scheduledEndTime)
      const baseSalary = Number(entry.baseSalary ?? 0)
      const annualSalary = baseSalary * 12

      let dailyHours = 11
      if (schedStart && schedEnd) {
        dailyHours = ((schedEnd.h * 60 + schedEnd.m) - (schedStart.h * 60 + schedStart.m)) / 60
      }
      const daysPerWeek = (employee?.scheduledDaysPerWeek as number | null) ?? 6.5
      const hoursPerYear = dailyHours * daysPerWeek * 52
      const hourlyRate = hoursPerYear > 0 ? annualSalary / hoursPerYear : 0
      const round2 = (n: number) => Math.round(n * 100) / 100

      let totalLateMinutes = 0
      let totalEarlyMinutes = 0
      let totalOvertimeCreditMinutes = 0
      let totalOvertimeMinutes = 0

      for (const att of attendanceRows) {
        const checkIn = att.checkIn as Date | null
        const checkOut = att.checkOut as Date | null
        // Use checkIn as base date — more reliable than att.date (avoids timezone-shifted timestamps)
        const baseDate = checkIn ? new Date(checkIn) : att.date as Date

        // Auto clock-out: if no checkOut recorded, treat as clocked out at scheduled end time
        let effectiveCheckOut = checkOut
        if (!effectiveCheckOut && schedEnd && checkIn) {
          const autoOut = new Date(baseDate)
          autoOut.setHours(schedEnd.h, schedEnd.m, 0, 0)
          if (autoOut > checkIn) effectiveCheckOut = autoOut
        }

        if (checkIn && schedStart) {
          const scheduled = new Date(baseDate)
          scheduled.setHours(schedStart.h, schedStart.m, 0, 0)
          const diffMs = checkIn.getTime() - scheduled.getTime()
          if (diffMs > 0) totalLateMinutes += Math.round(diffMs / 60000)
        }

        if (effectiveCheckOut && schedEnd) {
          const scheduled = new Date(baseDate)
          scheduled.setHours(schedEnd.h, schedEnd.m, 0, 0)
          const diffMs = effectiveCheckOut.getTime() - scheduled.getTime()
          if (diffMs < 0) {
            totalEarlyMinutes += Math.round(Math.abs(diffMs) / 60000)
          } else if (diffMs > 0 && checkOut) {
            // Only count overtime if it was a real clock-out (not auto)
            const extraMin = Math.round(diffMs / 60000)
            if (extraMin <= 30) totalOvertimeCreditMinutes += extraMin
            else totalOvertimeMinutes += extraMin
          }
        }
      }

      const deductionAmount = round2(((totalLateMinutes + totalEarlyMinutes) / 60) * hourlyRate)
      const creditAmount = round2((totalOvertimeCreditMinutes / 60) * hourlyRate)
      const overtimeAmount = round2((totalOvertimeMinutes / 60) * hourlyRate * 1.5)

      // Remove existing pending clock-in adjustments and recreate (approved ones are preserved)
      await prisma.payrollAdjustments.deleteMany({
        where: { payrollEntryId: entry.id, isClockInAdjustment: true, status: 'pending' } as any,
      })

      // De-duplicate stale approved clock_in_deduction records — keep only the most recently
      // updated (the user's explicit override). Old auto-approved records from before the
      // pending/approved split cause double-counting and must be cleaned up here.
      const allApprovedDeductions = await (prisma.payrollAdjustments as any).findMany({
        where: { payrollEntryId: entry.id, adjustmentType: 'clock_in_deduction', isClockInAdjustment: true, status: 'approved' },
        orderBy: { updatedAt: 'desc' },
      })
      if (allApprovedDeductions.length > 1) {
        const staleIds = allApprovedDeductions.slice(1).map((a: any) => a.id)
        await prisma.payrollAdjustments.deleteMany({ where: { id: { in: staleIds } } })
      }
      const existingApprovedDeduction = allApprovedDeductions.length > 0 ? allApprovedDeductions[0] : null
      if (deductionAmount > 0 && !existingApprovedDeduction) {
        await prisma.payrollAdjustments.create({
          data: {
            id: `PA-${nanoid(12)}`,
            payrollEntryId: entry.id,
            adjustmentType: 'clock_in_deduction',
            amount: -deductionAmount,
            isClockInAdjustment: true,
            reason: `Clock-in deduction: ${totalLateMinutes + totalEarlyMinutes} min tardiness`,
            createdBy: user.id,
            status: 'pending',
          } as any,
        })
      }
      // Skip if an approved overtime_credit adjustment already exists
      const existingApprovedCredit = await prisma.payrollAdjustments.findFirst({
        where: { payrollEntryId: entry.id, adjustmentType: 'overtime_credit', isClockInAdjustment: true, status: 'approved' } as any,
      })
      if (creditAmount > 0 && !existingApprovedCredit) {
        await prisma.payrollAdjustments.create({
          data: {
            id: `PA-${nanoid(12)}`,
            payrollEntryId: entry.id,
            adjustmentType: 'overtime_credit',
            amount: creditAmount,
            isClockInAdjustment: true,
            reason: `Overtime credit: ${totalOvertimeCreditMinutes} min`,
            createdBy: user.id,
            status: 'pending',
          } as any,
        })
      }
      const existingApprovedOvertime = await prisma.payrollAdjustments.findFirst({
        where: { payrollEntryId: entry.id, adjustmentType: 'overtime', isClockInAdjustment: true, status: 'approved' } as any,
      })
      if (overtimeAmount > 0 && !existingApprovedOvertime) {
        await prisma.payrollAdjustments.create({
          data: {
            id: `PA-${nanoid(12)}`,
            payrollEntryId: entry.id,
            adjustmentType: 'overtime',
            amount: overtimeAmount,
            isClockInAdjustment: true,
            reason: `Overtime: ${totalOvertimeMinutes} min at 1.5× rate`,
            createdBy: user.id,
            status: 'pending',
          } as any,
        })
      }

      await recalcEntry(entry.id)
      clockInUpdates++
    } catch (e: any) {
      errors.push(`Clock-in sync failed for entry ${entry.id}: ${e.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    synced: period.payroll_entries.length,
    absenceUpdates,
    clockInUpdates,
    errors,
    message: `Synced ${period.payroll_entries.length} entries — absences: ${absenceUpdates}, clock-in: ${clockInUpdates}${errors.length ? `, ${errors.length} error(s)` : ''}`,
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
  // totalDeductions = post-tax only (loans, advances, misc, other adjustments)
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
