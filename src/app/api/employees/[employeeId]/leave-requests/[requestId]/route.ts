import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { getServerUser } from '@/lib/get-server-user'
import { getEmployeeLeavePolicy } from '@/lib/payroll/leave-accrual'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string; requestId: string }> }
)
 {

    const { employeeId, requestId } = await params
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId, requestId } = await params

    // Check if user has permission to manage employee leave
    if (!await hasPermission(user, 'canManageEmployeeLeave', employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { status, rejectionReason } = await request.json()

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Valid status required (pending, approved, rejected)' }, { status: 400 })
    }

    // Get the leave request
    const leaveRequest = await prisma.employeeLeaveRequests.findUnique({
      where: { id: requestId },
      include: {
        employees_employee_leave_requests_employeeIdToemployees: {
          select: {
            fullName: true,
            employeeNumber: true
          }
        },
        employees_employee_leave_requests_approvedByToemployees: {
          select: {
            id: true,
            fullName: true,
              include: {
            job_titles: { select: { title: true } }
          }
          }
        }
      }
    })

    if (!leaveRequest || leaveRequest.employeeId !== employeeId) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Update the leave request
    const updatedRequest = await prisma.employeeLeaveRequests.update({
      where: { id: requestId },
      data: {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        approvedBy: status === 'approved' ? user.id : null,
        approvedAt: status === 'approved' ? new Date() : null
      },
      include: {
        employees_employee_leave_requests_employeeIdToemployees: {
          select: { fullName: true, employeeNumber: true }
        },
        employees_employee_leave_requests_approvedByToemployees: {
          select: { id: true, fullName: true, job_titles: { select: { title: true } } }
        }
      }
    })

    // If approved, update leave balance using policy-driven defaults
    if (status === 'approved' && (leaveRequest.leaveType === 'annual' || leaveRequest.leaveType === 'sick')) {
      const leaveYear = new Date(leaveRequest.startDate).getFullYear()
      const policy = await getEmployeeLeavePolicy(prisma as any, employeeId)

      if (leaveRequest.leaveType === 'annual') {
        await prisma.employeeLeaveBalance.upsert({
          where: { employeeId_year: { employeeId, year: leaveYear } },
          update: {
            usedAnnualDays: { increment: leaveRequest.daysRequested },
            remainingAnnual: { decrement: leaveRequest.daysRequested },
            updatedAt: new Date(),
          },
          create: {
            id: randomUUID(),
            employeeId,
            year: leaveYear,
            annualLeaveDays: policy.maxAnnualDays,
            usedAnnualDays: leaveRequest.daysRequested,
            remainingAnnual: policy.maxAnnualDays - leaveRequest.daysRequested,
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
            usedSickDays: { increment: leaveRequest.daysRequested },
            remainingSick: { decrement: leaveRequest.daysRequested },
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
            usedSickDays: leaveRequest.daysRequested,
            remainingSick: policy.sickDaysPerYear - leaveRequest.daysRequested,
            updatedAt: new Date(),
          },
        } as Prisma.EmployeeLeaveBalanceUpsertArgs)
      }
    }

    // If approved, also update any open payroll entry for that month in real time
    if (status === 'approved' && (leaveRequest.leaveType === 'annual' || leaveRequest.leaveType === 'sick')) {
      try {
        const leaveMonth = new Date(leaveRequest.startDate).getMonth() + 1
        const leaveYear  = new Date(leaveRequest.startDate).getFullYear()

        // Find the employee's primary business to locate the payroll period
        const emp = await prisma.employees.findUnique({
          where: { id: employeeId },
          select: { primaryBusinessId: true },
        })

        if (emp?.primaryBusinessId) {
          // Find an open payroll period for that month (draft or preview only — not locked)
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
            // Re-count all approved leave for this employee in the month (idempotent)
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

            // Update all payroll entries for this employee in this period
            await prisma.payrollEntries.updateMany({
              where: { payrollPeriodId: openPeriod.id, employeeId },
              data: { leaveDays, sickDays, updatedAt: new Date() },
            })
          }
        }
      } catch (e) {
        // Non-critical — log but don't fail the approval
        console.error('Failed to update payroll entry after leave approval:', e)
      }
    }

    // Format the response
    const formattedResponse = {
      ...updatedRequest,
      approver: (updatedRequest as any).employees_employee_leave_requests_approvedByToemployees ? {
        ...(updatedRequest as any).employees_employee_leave_requests_approvedByToemployees,
        jobTitle: (updatedRequest as any).employees_employee_leave_requests_approvedByToemployees.job_titles?.title || null
      } : null,
      employee: (updatedRequest as any).employees_employee_leave_requests_employeeIdToemployees || null
    }

    return NextResponse.json(formattedResponse)
  } catch (error) {
    console.error('Leave request update error:', error)
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string; requestId: string }> }
)
 {

    const { employeeId, requestId } = await params
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId, requestId } = await params

    // Check if user has permission to manage employee leave
    if (!await hasPermission(user, 'canManageEmployeeLeave', employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Only allow deletion of pending requests
    const leaveRequest = await prisma.employeeLeaveRequests.findUnique({
      where: { id: requestId }
    })

    if (!leaveRequest || leaveRequest.employeeId !== employeeId) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json({
        error: 'Only pending leave requests can be deleted'
      }, { status: 400 })
    }

    await prisma.employeeLeaveRequests.delete({
      where: { id: requestId }
    })

    return NextResponse.json({ message: 'Leave request deleted successfully' })
  } catch (error) {
    console.error('Leave request deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete leave request' }, { status: 500 })
  }
}