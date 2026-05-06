import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'
import { getEmployeeLeavePolicy } from '@/lib/payroll/leave-accrual'
import { randomUUID } from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await params

  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canManageEmployees') && !hasPermission(user, 'canAccessPayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { leaveRequestId, returnDate: returnDateStr } = body

    if (!leaveRequestId || !returnDateStr) {
      return NextResponse.json({ error: 'leaveRequestId and returnDate are required' }, { status: 400 })
    }

    const returnDate = new Date(returnDateStr)
    if (isNaN(returnDate.getTime())) {
      return NextResponse.json({ error: 'Invalid returnDate format' }, { status: 400 })
    }

    const leaveRequest = await prisma.employeeLeaveRequests.findUnique({
      where: { id: leaveRequestId },
    })

    if (!leaveRequest || leaveRequest.employeeId !== employeeId) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }
    if (leaveRequest.status !== 'approved') {
      return NextResponse.json({ error: 'Leave request is not approved' }, { status: 400 })
    }
    if ((leaveRequest as any).actualReturnDate) {
      return NextResponse.json({ error: 'Employee has already returned from this leave' }, { status: 400 })
    }

    const msPerDay = 1000 * 60 * 60 * 24
    const plannedDays = leaveRequest.daysRequested
    const startDate = new Date(leaveRequest.startDate)
    const leaveYear = startDate.getFullYear()
    const leaveType = leaveRequest.leaveType

    // Last day of actual leave = returnDate - 1
    const lastLeaveDay = new Date(returnDate)
    lastLeaveDay.setDate(lastLeaveDay.getDate() - 1)

    const actualDays = lastLeaveDay >= startDate
      ? Math.round((lastLeaveDay.getTime() - startDate.getTime()) / msPerDay) + 1
      : 0

    const refundDays = Math.max(0, plannedDays - actualDays)

    // Record actualReturnDate and correct daysRequested to actual
    await prisma.$executeRaw`
      UPDATE "employee_leave_requests"
      SET "actualReturnDate" = ${returnDate},
          "daysRequested"    = ${actualDays},
          "updatedAt"        = NOW()
      WHERE id = ${leaveRequestId}
    `

    // Refund unused days back to balance if employee returned early
    if (refundDays > 0) {
      if (leaveType === 'annual') {
        await prisma.employeeLeaveBalance.updateMany({
          where: { employeeId, year: leaveYear },
          data: {
            usedAnnualDays: { decrement: refundDays },
            remainingAnnual: { increment: refundDays },
            updatedAt: new Date(),
          },
        })
      } else if (leaveType === 'sick') {
        await prisma.employeeLeaveBalance.updateMany({
          where: { employeeId, year: leaveYear },
          data: {
            usedSickDays: { decrement: refundDays },
            remainingSick: { increment: refundDays },
            updatedAt: new Date(),
          },
        })
      }
    }

    // Sick leave overflow: excess sick days become absent days
    let overflowDays = 0
    if (leaveType === 'sick' && actualDays > 0) {
      const balance = await prisma.employeeLeaveBalance.findUnique({
        where: { employeeId_year: { employeeId, year: leaveYear } },
      })
      const allocation = balance
        ? Number(balance.sickLeaveDays)
        : (await getEmployeeLeavePolicy(prisma, employeeId)).sickDaysPerYear
      const usedSickDays = Number(balance?.usedSickDays ?? 0)
      overflowDays = Math.max(0, usedSickDays - allocation)

      if (overflowDays > 0) {
        const emp = await prisma.employees.findUnique({
          where: { id: employeeId },
          select: { primaryBusinessId: true },
        })
        const businessId = emp?.primaryBusinessId

        if (businessId) {
          // Absence dates = last overflowDays days of the actual leave period
          const daysToMark = Math.min(overflowDays, actualDays)
          for (let i = 0; i < daysToMark; i++) {
            const absenceDate = new Date(lastLeaveDay)
            absenceDate.setDate(absenceDate.getDate() - i)
            absenceDate.setHours(0, 0, 0, 0)

            const existing: any[] = await prisma.$queryRaw`
              SELECT id FROM "employee_absences"
              WHERE "employeeId" = ${employeeId} AND date = ${absenceDate}::date
            `
            if (existing.length === 0) {
              await prisma.employeeAbsences.create({
                data: {
                  id: randomUUID(),
                  employeeId,
                  businessId,
                  date: absenceDate,
                  recordedBy: user.id,
                  notes: 'Sick leave overflow — converted from excess sick leave',
                },
              })
            }
          }
        }
      }
    }

    // Idempotent payroll entry re-sync for the leave month
    try {
      const leaveMonth = startDate.getMonth() + 1

      const emp = await prisma.employees.findUnique({
        where: { id: employeeId },
        select: { primaryBusinessId: true },
      })

      if (emp?.primaryBusinessId) {
        const openPeriod = await prisma.payrollPeriods.findFirst({
          where: {
            businessId: emp.primaryBusinessId,
            year: leaveYear,
            month: leaveMonth,
            status: { in: ['draft', 'preview'] },
          },
          select: { id: true },
        })

        if (openPeriod) {
          const fromDate = new Date(leaveYear, leaveMonth - 1, 1, 0, 0, 0, 0)
          const toDate   = new Date(leaveYear, leaveMonth, 0, 23, 59, 59, 999)

          const allApproved = await prisma.employeeLeaveRequests.findMany({
            where: {
              employeeId,
              status: 'approved',
              startDate: { gte: fromDate, lte: toDate },
            },
            select: { leaveType: true, daysRequested: true },
          })

          const leaveDays = allApproved
            .filter(r => r.leaveType === 'annual')
            .reduce((sum, r) => sum + r.daysRequested, 0)
          const sickDays = allApproved
            .filter(r => r.leaveType === 'sick')
            .reduce((sum, r) => sum + r.daysRequested, 0)

          await prisma.payrollEntries.updateMany({
            where: { payrollPeriodId: openPeriod.id, employeeId },
            data: { leaveDays, sickDays, updatedAt: new Date() },
          })
        }
      }
    } catch (e) {
      console.error('Failed to update payroll entry after return to work:', e)
    }

    return NextResponse.json({
      success: true,
      employeeId,
      leaveRequestId,
      returnDate,
      actualDays,
      plannedDays,
      refundDays,
      overflowDays,
      message: overflowDays > 0
        ? `${overflowDays} excess sick day(s) converted to unpaid absent days`
        : 'Employee successfully returned to work',
    })
  } catch (error) {
    console.error('Return to work error:', error)
    return NextResponse.json({ error: 'Failed to process return to work' }, { status: 500 })
  }
}
