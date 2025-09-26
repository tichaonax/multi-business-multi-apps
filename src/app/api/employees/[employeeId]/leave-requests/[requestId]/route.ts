import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: { employeeId: string; requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId, requestId } = await params

    // Check if user has permission to manage employee leave
    if (!await hasPermission(session.user, 'canManageEmployeeLeave', employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { status, rejectionReason } = await request.json()

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Valid status required (pending, approved, rejected)' }, { status: 400 })
    }

    // Get the leave request
    const leaveRequest = await prisma.employeeLeaveRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          select: {
            fullName: true,
            employeeNumber: true
          }
        }
      }
    })

    if (!leaveRequest || leaveRequest.employeeId !== employeeId) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Update the leave request
    const updatedRequest = await prisma.employeeLeaveRequest.update({
      where: { id: requestId },
      data: {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        approvedBy: status === 'approved' ? session.user.id : null,
        approvedAt: status === 'approved' ? new Date() : null
      },
      include: {
        employee: {
          select: {
            fullName: true,
            employeeNumber: true
          }
        },
        approver: {
          select: {
            id: true,
            fullName: true,
            jobTitles: {
              select: { title: true }
            }
          }
        }
      }
    })

    // If approved, update leave balance
    if (status === 'approved' && leaveRequest.leaveType === 'annual') {
      const currentYear = new Date().getFullYear()
      
      // Update or create leave balance
      await prisma.employeeLeaveBalance.upsert({
        where: {
          employeeId_year: {
            employeeId,
            year: currentYear
          }
        },
        update: {
          usedAnnualDays: {
            increment: leaveRequest.daysRequested
          },
          remainingAnnual: {
            decrement: leaveRequest.daysRequested
          }
        },
        create: {
          employeeId,
          year: currentYear,
          annualLeaveDays: 21, // Default annual leave days
          usedAnnualDays: leaveRequest.daysRequested,
          remainingAnnual: 21 - leaveRequest.daysRequested,
          sickLeaveDays: 10, // Default sick leave days
          usedSickDays: 0,
          remainingSick: 10
        }
      })
    } else if (status === 'approved' && leaveRequest.leaveType === 'sick') {
      const currentYear = new Date().getFullYear()
      
      // Update or create leave balance
      await prisma.employeeLeaveBalance.upsert({
        where: {
          employeeId_year: {
            employeeId,
            year: currentYear
          }
        },
        update: {
          usedSickDays: {
            increment: leaveRequest.daysRequested
          },
          remainingSick: {
            decrement: leaveRequest.daysRequested
          }
        },
        create: {
          employeeId,
          year: currentYear,
          annualLeaveDays: 21,
          usedAnnualDays: 0,
          remainingAnnual: 21,
          sickLeaveDays: 10,
          usedSickDays: leaveRequest.daysRequested,
          remainingSick: 10 - leaveRequest.daysRequested
        }
      })
    }

    // Format the response
    const formattedResponse = {
      ...updatedRequest,
      approver: updatedRequest.approver ? {
        ...updatedRequest.approver,
        jobTitle: updatedRequest.approver.jobTitles?.title || null,
        jobTitles: undefined
      } : null
    }

    return NextResponse.json(formattedResponse)
  } catch (error) {
    console.error('Leave request update error:', error)
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { employeeId: string; requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId, requestId } = await params

    // Check if user has permission to manage employee leave
    if (!await hasPermission(session.user, 'canManageEmployeeLeave', employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Only allow deletion of pending requests
    const leaveRequest = await prisma.employeeLeaveRequest.findUnique({
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

    await prisma.employeeLeaveRequest.delete({
      where: { id: requestId }
    })

    return NextResponse.json({ message: 'Leave request deleted successfully' })
  } catch (error) {
    console.error('Leave request deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete leave request' }, { status: 500 })
  }
}