import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

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

    const disciplinaryActions = await prisma.disciplinaryAction.findMany({
      where: whereClause,
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
            primaryBusiness: {
              select: {
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
      },
      orderBy: [
        { actionDate: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(disciplinaryActions)
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
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const disciplinaryAction = await prisma.disciplinaryAction.create({
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
            primaryBusiness: {
              select: {
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
        }
      }
    })

    return NextResponse.json(disciplinaryAction)
  } catch (error) {
    console.error('Disciplinary action creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create disciplinary action' },
      { status: 500 }
    )
  }
}