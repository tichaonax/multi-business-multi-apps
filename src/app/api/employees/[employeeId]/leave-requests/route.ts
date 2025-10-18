import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
)
 {

    const { employeeId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params

    // Check if user has permission to view employee leave requests
    if (!await hasPermission(session.user, 'canViewEmployeeLeave', employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const leaveRequests = await prisma.employeeLeaveRequests.findMany({
      where: { employeeId },
      include: {
        employees_employee_leave_requests_employeeIdToemployees: {
          include: {
            job_titles: {
              select: { title: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Convert Decimal amounts to numbers for JSON serialization
    const formattedRequests = leaveRequests.map((r: any) => {
      const req: any = { ...r }
      const approver = req.employees_employee_leave_requests_approvedByToemployees
      if (approver) {
        req.approver = {
          id: approver.id,
          fullName: approver.fullName,
          jobTitle: approver.job_titles?.title || null
        }
      } else {
        req.approver = null
      }

      // remove internal relation key
      delete req.employees_employee_leave_requests_approvedByToemployees
      return req
    })

    return NextResponse.json(formattedRequests)
  } catch (error) {
    console.error('Leave requests fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
)
 {

    const { employeeId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params

    // Check if user has permission to create leave requests for this employee
    if (!await hasPermission(session.user, 'canManageEmployeeLeave', employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const {
      leaveType,
      startDate,
      endDate,
      reason,
      daysRequested
    } = await request.json()

    if (!leaveType || !startDate || !endDate || !daysRequested) {
      return NextResponse.json({ 
        error: 'Leave type, start date, end date, and days requested are required' 
      }, { status: 400 })
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start >= end) {
      return NextResponse.json({ 
        error: 'End date must be after start date' 
      }, { status: 400 })
    }

    // Check if employee exists and is active
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      select: { isActive: true, fullName: true }
    })

    if (!employee || !employee.isActive) {
      return NextResponse.json({ error: 'Employee not found or inactive' }, { status: 404 })
    }

    // Check leave balance for annual leave
    if (leaveType === 'annual') {
      const currentYear = new Date().getFullYear()
      const leaveBalance = await prisma.employeeLeaveBalance.findUnique({
        where: {
          employeeId_year: {
            employeeId,
            year: currentYear
          }
        }
      })

      if (leaveBalance && leaveBalance.remainingAnnual < daysRequested) {
        return NextResponse.json({
          error: `Insufficient annual leave balance. Available: ${leaveBalance.remainingAnnual} days, Requested: ${daysRequested} days`
        }, { status: 400 })
      }
    }

    // Create leave request using Unchecked input to satisfy Prisma input types
    const leaveRequestData: Prisma.EmployeeLeaveRequestUncheckedCreateInput = {
      id: randomUUID(),
      employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      daysRequested: Number(daysRequested),
      reason: reason || null,
      status: 'pending',
      updatedAt: new Date()
    }

    const leaveRequest = await prisma.employeeLeaveRequests.create({
      data: leaveRequestData,
      include: {
        employee: {
          select: {
            fullName: true,
            employeeNumber: true
          }
        }
      }
    })

    return NextResponse.json(leaveRequest)
  } catch (error) {
    console.error('Leave request creation error:', error)
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
  }
}