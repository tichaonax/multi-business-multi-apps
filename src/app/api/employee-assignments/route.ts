import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')
    const businessId = searchParams.get('businessId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const whereClause: any = {}
    
    if (employeeId) {
      whereClause.employeeId = employeeId
    }
    
    if (businessId) {
      whereClause.businessId = businessId
    }
    
    if (!includeInactive) {
      whereClause.isActive = true
    }

    const assignments = await prisma.employeeBusinessAssignments.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            job_titles: {
              select: {
                title: true,
                department: true
              }
            }
          }
        },
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      orderBy: [
        { assignedAt: 'desc' }
      ]
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Employee assignments fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee assignments' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage employees
    if (!hasPermission(user, 'canEditEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      employeeId,
      businessId,
      role,
      supervisorId
    } = data

    // Validation
    if (!employeeId || !businessId) {
      return NextResponse.json(
        { error: 'Employee ID and Business ID are required' },
        { status: 400 }
      )
    }

    // Verify employee exists. Include businesses list and derive primaryBusiness as the first item for compatibility.
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.employeeBusinessAssignments.findUnique({
      where: {
        employeeId_businessId: {
          employeeId,
          businessId
        }
      }
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Employee is already assigned to this business' },
        { status: 400 }
      )
    }

    // Verify supervisor exists if provided
    let supervisor = null
    if (supervisorId) {
      supervisor = await prisma.employees.findUnique({
        where: { id: supervisorId }
      })

      if (!supervisor) {
        return NextResponse.json(
          { error: 'Supervisor not found' },
          { status: 404 }
        )
      }
    }

    // Create the assignment
    const assignment = await prisma.employeeBusinessAssignments.create({
      data: {
        employeeId,
        businessId,
        role: role || null,
        assignedBy: user.id,
        assignedAt: new Date()
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            job_titles: {
              select: {
                title: true,
                department: true
              }
            }
          }
        },
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    // Update supervisor if different from current and if it's not the primary business
    if (supervisorId) {
      const primaryBusiness = Array.isArray(employee?.businesses) && employee.businesses.length > 0
        ? employee.businesses[0]
        : null

      // For cross-business assignments, we may want business-specific supervisors.
      // For now, update the main supervisor only when the assignment's businessId matches the employee's primary business.
      if (primaryBusiness && primaryBusiness.id === businessId) {
        await prisma.employees.update({
          where: { id: employeeId },
          data: { supervisorId }
        })
      }
    }

    return NextResponse.json(assignment)
  } catch (error: any) {
    console.error('Employee assignment creation error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Employee is already assigned to this business' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create employee assignment' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage employees
    if (!hasPermission(user, 'canEditEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      employeeId,
      businessId,
      role,
      isActive
    } = data

    // Validation
    if (!employeeId || !businessId) {
      return NextResponse.json(
        { error: 'Employee ID and Business ID are required' },
        { status: 400 }
      )
    }

    // Check if assignment exists
    const existingAssignment = await prisma.employeeBusinessAssignments.findUnique({
      where: {
        employeeId_businessId: {
          employeeId,
          businessId
        }
      }
    })

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Update the assignment
    const updatedAssignment = await prisma.employeeBusinessAssignments.update({
      where: {
        employeeId_businessId: {
          employeeId,
          businessId
        }
      },
      data: {
        role: role || null,
        isActive: isActive !== undefined ? isActive : existingAssignment.isActive,
        updatedAt: new Date()
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            job_titles: {
              select: {
                title: true,
                department: true
              }
            }
          }
        },
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    return NextResponse.json(updatedAssignment)
  } catch (error) {
    console.error('Employee assignment update error:', error)
    return NextResponse.json(
      { error: 'Failed to update employee assignment' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage employees
    if (!hasPermission(user, 'canEditEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')
    const businessId = searchParams.get('businessId')

    if (!employeeId || !businessId) {
      return NextResponse.json(
        { error: 'Employee ID and Business ID are required' },
        { status: 400 }
      )
    }

    // Check if assignment exists
    const existingAssignment = await prisma.employeeBusinessAssignments.findUnique({
      where: {
        employeeId_businessId: {
          employeeId,
          businessId
        }
      }
    })

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Delete the assignment
    await prisma.employeeBusinessAssignments.delete({
      where: {
        employeeId_businessId: {
          employeeId,
          businessId
        }
      }
    })

    return NextResponse.json({ message: 'Assignment deleted successfully' })
  } catch (error) {
    console.error('Employee assignment deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete employee assignment' },
      { status: 500 }
    )
  }
}