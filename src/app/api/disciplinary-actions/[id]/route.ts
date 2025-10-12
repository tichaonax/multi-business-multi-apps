import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const disciplinaryAction = await prisma.disciplinaryActions.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            jobTitle: {
              select: {
                title: true,
                department: true
              }
            },
            // Employee relation is named `businesses` in Prisma schema (primaryBusinessId relation).
            businesses: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        createdByUser: {
          select: {
            name: true
          }
        },
        resolvedByUser: {
          select: {
            name: true
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

    // Normalize shape for clients: expose employee.primaryBusiness (first business) for compatibility
    try {
      const actionAny: any = disciplinaryAction
      if (actionAny.employee) {
        const firstBusiness = Array.isArray(actionAny.employee.businesses) && actionAny.employee.businesses.length > 0
          ? actionAny.employee.businesses[0]
          : null
        actionAny.employee.primaryBusiness = firstBusiness
        // optionally keep businesses array as-is; clients expect primaryBusiness specifically
      }
      return NextResponse.json(actionAny)
    } catch (e) {
      return NextResponse.json(disciplinaryAction)
    }
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage disciplinary actions
    if (!hasPermission(session.user, 'canManageDisciplinaryActions')) {
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
        updateData.resolvedBy = session.user.id
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
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            jobTitle: {
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
        createdByUser: {
          select: {
            name: true
          }
        },
        resolvedByUser: {
          select: {
            name: true
          }
        }
      }
    })

    // Attach primaryBusiness to employee for compatibility
    try {
      const actionAny: any = updatedAction
      if (actionAny.employee) {
        const firstBusiness = Array.isArray(actionAny.employee.businesses) && actionAny.employee.businesses.length > 0
          ? actionAny.employee.businesses[0]
          : null
        actionAny.employee.primaryBusiness = firstBusiness
      }
      return NextResponse.json(actionAny)
    } catch (e) {
      return NextResponse.json(updatedAction)
    }
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage disciplinary actions
    if (!hasPermission(session.user, 'canManageDisciplinaryActions')) {
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