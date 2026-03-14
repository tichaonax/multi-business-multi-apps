import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

// POST /api/payroll/entries/[entryId]/sync-absences
// Reads EmployeeAbsences records for the pay period month and writes the
// count into absenceDaysFromRecords on the entry.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(user, 'canEditPayrollEntry') && !hasPermission(user, 'canAccessPayroll')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { entryId } = await params

  const entry = await prisma.payrollEntries.findUnique({
    where: { id: entryId },
    include: {
      payroll_periods: { select: { id: true, year: true, month: true, status: true, businessId: true } },
    },
  })

  if (!entry) return NextResponse.json({ error: 'Payroll entry not found' }, { status: 404 })

  const period = (entry as any).payroll_periods
  if (!period) return NextResponse.json({ error: 'No payroll period attached to entry' }, { status: 400 })
  if (['approved', 'closed', 'exported'].includes(period.status)) {
    return NextResponse.json({ error: 'Cannot sync absences for approved/closed/exported payroll' }, { status: 400 })
  }

  const employeeId = entry.employeeId
  if (!employeeId) return NextResponse.json({ error: 'No employeeId on entry' }, { status: 400 })

  // Count absence records for this employee in the payroll month
  const fromDate = new Date(period.year, period.month - 1, 1, 0, 0, 0, 0)
  const toDate = new Date(period.year, period.month, 0, 23, 59, 59, 999)

  const absenceCount = await prisma.employeeAbsences.count({
    where: {
      employeeId,
      date: { gte: fromDate, lte: toDate },
    },
  })

  // Update absenceDaysFromRecords; also set absenceDays if not manually overridden
  const currentAbsenceDays = Number(entry.absenceDays ?? 0)
  const currentFromRecords = Number((entry as any).absenceDaysFromRecords ?? 0)

  // Only auto-update absenceDays if it matches the previous fromRecords value (i.e. not manually overridden)
  const shouldUpdateAbsenceDays = currentAbsenceDays === currentFromRecords

  await prisma.payrollEntries.update({
    where: { id: entryId },
    data: {
      absenceDaysFromRecords: absenceCount,
      ...(shouldUpdateAbsenceDays ? { absenceDays: absenceCount } : {}),
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({
    absenceDaysFromRecords: absenceCount,
    absenceDaysUpdated: shouldUpdateAbsenceDays,
    absenceDays: shouldUpdateAbsenceDays ? absenceCount : currentAbsenceDays,
  })
}
