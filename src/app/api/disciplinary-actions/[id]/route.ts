import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const disciplinaryAction = await prisma.disciplinaryActions.findUnique({
      where: { id },
      include: {
        employees_disciplinary_actions_employeeIdToemployees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            job_titles: {
              select: {
                title: true,
                department: true
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
        },
        employees_disciplinary_actions_createdByToemployees: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    })

    if (!disciplinaryAction) {
      return NextResponse.json(
        { error: 'Disciplinary action not found' },
        { status: 404 }
      )
    }

    // Transform for UI compatibility
    const transformed: any = {
      ...disciplinaryAction,
      employee: disciplinaryAction.employees_disciplinary_actions_employeeIdToemployees,
      createdByUser: disciplinaryAction.employees_disciplinary_actions_createdByToemployees
        ? { name: disciplinaryAction.employees_disciplinary_actions_createdByToemployees.fullName }
        : null
    }

    // Normalize shape for clients: expose employee.primaryBusiness (first business) for compatibility
    if (transformed.employee) {
      const firstBusiness = Array.isArray(transformed.employee.businesses) && transformed.employee.businesses.length > 0
        ? transformed.employee.businesses[0]
        : null
      transformed.employee.primaryBusiness = firstBusiness
    }

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Disciplinary action fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch disciplinary action' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage disciplinary actions
    if (!hasPermission(user, 'canManageDisciplinaryActions')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const data = await req.json()
    const {
      type,
      severity,
      description,
      actionTaken,
      actionDate,
      followUpDate,
      notes,
      isResolved,
      resolvedDate
    } = data

    // Check if disciplinary action exists
    const existingAction = await prisma.disciplinaryActions.findUnique({
      where: { id }
    })

    if (!existingAction) {
      return NextResponse.json(
        { error: 'Disciplinary action not found' },
        { status: 404 }
      )
    }

    // Validate severity if provided
    if (severity) {
      const validSeverities = ['low', 'medium', 'high', 'critical']
      if (!validSeverities.includes(severity)) {
        return NextResponse.json(
          { error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: any = {}
    
    if (type !== undefined) updateData.type = type
    if (severity !== undefined) updateData.severity = severity
    if (description !== undefined) updateData.description = description
    if (actionTaken !== undefined) updateData.actionTaken = actionTaken
    if (actionDate !== undefined) updateData.actionDate = new Date(actionDate)
    if (followUpDate !== undefined) updateData.followUpDate = followUpDate ? new Date(followUpDate) : null
    if (notes !== undefined) updateData.notes = notes || null
    
    // Handle resolution
    if (isResolved !== undefined) {
      updateData.isResolved = isResolved
      if (isResolved && !existingAction.isResolved) {
        // Mark as resolved
        updateData.resolvedDate = resolvedDate ? new Date(resolvedDate) : new Date()
        updateData.resolvedBy = user.id
      } else if (!isResolved && existingAction.isResolved) {
        // Reopen the action
        updateData.resolvedDate = null
        updateData.resolvedBy = null
      }
    }

    const updatedAction = await prisma.disciplinaryActions.update({
      where: { id },
      data: updateData,
      include: {
        employees_disciplinary_actions_employeeIdToemployees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            job_titles: {
              select: {
                title: true,
                department: true
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
        },
        employees_disciplinary_actions_createdByToemployees: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    })

    // Transform for UI compatibility
    const transformed: any = {
      ...updatedAction,
      employee: updatedAction.employees_disciplinary_actions_employeeIdToemployees,
      createdByUser: updatedAction.employees_disciplinary_actions_createdByToemployees
        ? { name: updatedAction.employees_disciplinary_actions_createdByToemployees.fullName }
        : null
    }

    // Attach primaryBusiness to employee for compatibility
    if (transformed.employee) {
      const firstBusiness = Array.isArray(transformed.employee.businesses) && transformed.employee.businesses.length > 0
        ? transformed.employee.businesses[0]
        : null
      transformed.employee.primaryBusiness = firstBusiness
    }

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Disciplinary action update error:', error)
    return NextResponse.json(
      { error: 'Failed to update disciplinary action' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage disciplinary actions
    if (!hasPermission(user, 'canManageDisciplinaryActions')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    // Check if disciplinary action exists
    const existingAction = await prisma.disciplinaryActions.findUnique({
      where: { id }
    })

    if (!existingAction) {
      return NextResponse.json(
        { error: 'Disciplinary action not found' },
        { status: 404 }
      )
    }

    await prisma.disciplinaryActions.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Disciplinary action deleted successfully' })
  } catch (error) {
    console.error('Disciplinary action deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete disciplinary action' },
      { status: 500 }
    )
  }
}