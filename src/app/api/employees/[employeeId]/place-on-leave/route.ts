import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'
import { getEmployeeLeavePolicy } from '@/lib/payroll/leave-accrual'
import { Prisma } from '@prisma/client'
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
    const { leaveType, startDate: startDateStr, expectedReturnDate: returnDateStr, reason } = body

    if (!leaveType || !['annual', 'sick'].includes(leaveType)) {
      return NextResponse.json({ error: 'leaveType must be annual or sick' }, { status: 400 })
    }
    if (!startDateStr || !returnDateStr) {
      return NextResponse.json({ error: 'startDate and expectedReturnDate are required' }, { status: 400 })
    }

    const startDate = new Date(startDateStr)
    const expectedReturnDate = new Date(returnDateStr)

    if (isNaN(startDate.getTime()) || isNaN(expectedReturnDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // endDate = last day of leave = expectedReturnDate - 1 day
    const endDate = new Date(expectedReturnDate)
    endDate.setDate(endDate.getDate() - 1)

    if (endDate < startDate) {
      return NextResponse.json({ error: 'expectedReturnDate must be after startDate' }, { status: 400 })
    }

    const msPerDay = 1000 * 60 * 60 * 24
    const daysRequested = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1

    const leaveYear = startDate.getFullYear()
    const policy = await getEmployeeLeavePolicy(prisma, employeeId)

    // Create the leave request as already approved (HR direct action)
    const leaveRequest = await prisma.employeeLeaveRequests.create({
      data: {
        id: randomUUID(),
        employeeId,
        leaveType,
        startDate,
        endDate,
        daysRequested,
        status: 'approved',
        approvedBy: user.id,
        approvedAt: new Date(),
        reason: reason ?? null,
        updatedAt: new Date(),
      },
    })

    // Update leave balance (same logic as approval flow)
    if (leaveType === 'annual') {
      await prisma.employeeLeaveBalance.upsert({
        where: { employeeId_year: { employeeId, year: leaveYear } },
        update: {
          usedAnnualDays: { increment: daysRequested },
          remainingAnnual: { decrement: daysRequested },
          updatedAt: new Date(),
        },
        create: {
          id: randomUUID(),
          employeeId,
          year: leaveYear,
          annualLeaveDays: policy.maxAnnualDays,
          usedAnnualDays: daysRequested,
          remainingAnnual: policy.maxAnnualDays - daysRequested,
          sickLeaveDays: policy.sickDaysPerYear,
          usedSickDays: 0,
          remainingSick: policy.sickDaysPerYear,
          updatedAt: new Date(),
        },
      } as Prisma.EmployeeLeaveBalanceUpsertArgs)
    } else {
      await prisma.employeeLeaveBalance.upsert({
        where: { employeeId_year: { employeeId, year: leaveYear } },
        update: {
          usedSickDays: { increment: daysRequested },
          remainingSick: { decrement: daysRequested },
          updatedAt: new Date(),
        },
        create: {
          id: randomUUID(),
          employeeId,
          year: leaveYear,
          annualLeaveDays: policy.maxAnnualDays,
          usedAnnualDays: 0,
          remainingAnnual: policy.maxAnnualDays,
          sickLeaveDays: policy.sickDaysPerYear,
          usedSickDays: daysRequested,
          remainingSick: policy.sickDaysPerYear - daysRequested,
          updatedAt: new Date(),
        },
      } as Prisma.EmployeeLeaveBalanceUpsertArgs)
    }

    // Update open payroll entry for the leave month (idempotent re-count)
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
      console.error('Failed to update payroll entry after place-on-leave:', e)
    }

    return NextResponse.json({
      leaveRequestId: leaveRequest.id,
      employeeId,
      leaveType,
      startDate,
      endDate,
      daysRequested,
      status: 'approved',
    }, { status: 201 })
  } catch (error) {
    console.error('Place on leave error:', error)
    return NextResponse.json({ error: 'Failed to place employee on leave' }, { status: 500 })
  }
}
