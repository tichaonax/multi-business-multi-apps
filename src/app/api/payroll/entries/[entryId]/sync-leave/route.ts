import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

/**
 * POST /api/payroll/entries/[entryId]/sync-leave
 *
 * Counts approved EmployeeLeaveRequests for the payroll period month and
 * writes the totals into leaveDays and sickDays on the entry.
 *
 * Mirrors the sync-absences pattern — safe to call multiple times (idempotent).
 * Blocked on approved/closed/exported payroll periods.
 */
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
      payroll_periods: {
        select: { id: true, year: true, month: true, status: true },
      },
    },
  })

  if (!entry) return NextResponse.json({ error: 'Payroll entry not found' }, { status: 404 })

  const period = (entry as any).payroll_periods
  if (!period) return NextResponse.json({ error: 'No payroll period attached to entry' }, { status: 400 })

  if (['approved', 'closed', 'exported'].includes(period.status)) {
    return NextResponse.json(
      { error: 'Cannot sync leave for approved/closed/exported payroll' },
      { status: 400 }
    )
  }

  const employeeId = entry.employeeId
  if (!employeeId) return NextResponse.json({ error: 'No employeeId on entry' }, { status: 400 })

  // Date range for the payroll period month
  const fromDate = new Date(period.year, period.month - 1, 1, 0, 0, 0, 0)
  const toDate   = new Date(period.year, period.month, 0, 23, 59, 59, 999)

  // Fetch all approved leave requests whose start date falls within the period month
  const leaveRequests = await prisma.employeeLeaveRequests.findMany({
    where: {
      employeeId,
      status: 'approved',
      startDate: { gte: fromDate, lte: toDate },
    },
    select: { leaveType: true, daysRequested: true },
  })

  const leaveDays = leaveRequests
    .filter(r => r.leaveType === 'annual')
    .reduce((sum, r) => sum + r.daysRequested, 0)

  const sickDays = leaveRequests
    .filter(r => r.leaveType === 'sick')
    .reduce((sum, r) => sum + r.daysRequested, 0)

  await prisma.payrollEntries.update({
    where: { id: entryId },
    data: {
      leaveDays,
      sickDays,
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({ leaveDays, sickDays, requestsFound: leaveRequests.length })
}
