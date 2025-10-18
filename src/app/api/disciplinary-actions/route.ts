import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')
    const isResolved = searchParams.get('isResolved')
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')

    const whereClause: any = {}
    
    if (employeeId) {
      whereClause.employeeId = employeeId
    }
    
    if (isResolved !== null) {
      whereClause.isResolved = isResolved === 'true'
    }
    
    if (severity) {
      whereClause.severity = severity
    }
    
    if (type) {
      whereClause.type = type
    }

    const disciplinaryActions = await prisma.disciplinaryActions.findMany({
      where: whereClause,
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
      },
      orderBy: [
        { actionDate: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Transform for UI compatibility
    const transformed = disciplinaryActions.map(action => ({
      ...action,
      employee: action.employees_disciplinary_actions_employeeIdToemployees,
      createdByUser: action.employees_disciplinary_actions_createdByToemployees
        ? { name: action.employees_disciplinary_actions_createdByToemployees.fullName }
        : null
    }))

    // Attach primaryBusiness (first business) to employee for backwards compatibility
    try {
      const normalized = (transformed as any[]).map(act => {
        if (act.employee) {
          const firstBusiness = Array.isArray(act.employee.businesses) && act.employee.businesses.length > 0
            ? act.employee.businesses[0]
            : null
          act.employee.primaryBusiness = firstBusiness
        }
        return act
      })
      return NextResponse.json(normalized)
    } catch (e) {
      return NextResponse.json(transformed)
    }
  } catch (error) {
    console.error('Disciplinary actions fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch disciplinary actions' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage disciplinary actions
    if (!hasPermission(session.user, 'canManageDisciplinaryActions')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      employeeId,
      type,
      severity,
      description,
      actionTaken,
      actionDate,
      followUpDate,
      notes
    } = data

    // Validation
    if (!employeeId || !type || !severity || !description || !actionTaken || !actionDate) {
      return NextResponse.json(
        { error: 'Employee, type, severity, description, action taken, and action date are required' },
        { status: 400 }
      )
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical']
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify employee exists
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const disciplinaryAction = await prisma.disciplinaryActions.create({
      data: {
        employeeId,
        type,
        severity,
        description,
        actionTaken,
        actionDate: new Date(actionDate),
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes || null,
        createdBy: session.user.id
      },
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
    const transformed = {
      ...disciplinaryAction,
      employee: disciplinaryAction.employees_disciplinary_actions_employeeIdToemployees,
      createdByUser: disciplinaryAction.employees_disciplinary_actions_createdByToemployees
        ? { name: disciplinaryAction.employees_disciplinary_actions_createdByToemployees.fullName }
        : null
    }

    // Add primaryBusiness for UI
    if (transformed.employee) {
      const firstBusiness = Array.isArray(transformed.employee.businesses) && transformed.employee.businesses.length > 0
        ? transformed.employee.businesses[0]
        : null
      transformed.employee.primaryBusiness = firstBusiness
    }

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Disciplinary action creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create disciplinary action' },
      { status: 500 }
    )
  }
}