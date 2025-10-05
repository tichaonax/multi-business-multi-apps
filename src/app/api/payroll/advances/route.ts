import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'

// GET /api/payroll/advances
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user, 'canManageAdvances')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')

    const where: any = {}

    if (employeeId) {
      where.employeeId = employeeId
    }

    if (status) {
      where.status = status
    }

    const advances = await prisma.employeeAdvance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            nationalId: true,
            email: true
          }
        },
        approver: {
          select: {
            id: true,
            fullName: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        advancePayments: {
          orderBy: { paymentDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(advances)
  } catch (error) {
    console.error('Employee advances fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee advances' },
      { status: 500 }
    )
  }
}

// POST /api/payroll/advances
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user, 'canManageAdvances')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      employeeId,
      amount,
      advanceDate,
      totalMonths,
      reason,
      approvedBy,
      notes
    } = data

    // Validation
    if (!employeeId || !amount || !advanceDate || !totalMonths) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (totalMonths < 1) {
      return NextResponse.json(
        { error: 'Total months must be at least 1' },
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

    // Calculate deduction amount per month
    const advanceAmount = parseFloat(amount)
    const months = parseInt(totalMonths)
    const deductionAmount = advanceAmount / months

    // Create advance
    const advance = await prisma.employeeAdvance.create({
      data: {
        id: `ADV-${nanoid(12)}`,
        employeeId,
        amount: advanceAmount,
        advanceDate: new Date(advanceDate),
        deductionAmount,
        totalMonths: months,
        remainingMonths: months,
        remainingBalance: advanceAmount,
        status: 'active',
        reason: reason || null,
        approvedBy: approvedBy || null,
        approvedAt: approvedBy ? new Date() : null,
        createdBy: session.user.id,
        notes: notes || null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            nationalId: true,
            email: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(advance, { status: 201 })
  } catch (error) {
    console.error('Employee advance creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create employee advance' },
      { status: 500 }
    )
  }
}
