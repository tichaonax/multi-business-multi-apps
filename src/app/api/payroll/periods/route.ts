import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'

// GET /api/payroll/periods - List payroll periods for a business
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    if (!hasPermission(session.user, 'canAccessPayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    const year = searchParams.get('year')
    const status = searchParams.get('status')

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Build filter
    const where: any = { businessId }

    if (year) {
      where.year = parseInt(year)
    }

    if (status) {
      where.status = status
    }

    const periods = await prisma.payrollPeriod.findMany({
      where,
      include: {
        business: {
          select: { id: true, name: true, type: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { payrollEntries: true }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    })

    return NextResponse.json(periods)
  } catch (error) {
    console.error('Payroll periods fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll periods' },
      { status: 500 }
    )
  }
}

// POST /api/payroll/periods - Create new payroll period
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    if (!hasPermission(session.user, 'canCreatePayrollPeriod')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const { businessId, year, month, periodStart, periodEnd, notes } = data

    // Validation
    if (!businessId || !year || !month || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Month must be between 1 and 12' },
        { status: 400 }
      )
    }

    // Check if period already exists
    const existingPeriod = await prisma.payrollPeriod.findUnique({
      where: {
        businessId_year_month: {
          businessId,
          year: parseInt(year),
          month: parseInt(month)
        }
      }
    })

    if (existingPeriod) {
      return NextResponse.json(
        { error: 'Payroll period for this month already exists' },
        { status: 400 }
      )
    }

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Create payroll period
    const period = await prisma.payrollPeriod.create({
      data: {
        id: `PP-${nanoid(12)}`,
        businessId,
        year: parseInt(year),
        month: parseInt(month),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: 'draft',
        totalEmployees: 0,
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        createdBy: session.user.id,
        notes: notes || null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        business: {
          select: { id: true, name: true, type: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    console.error('Payroll period creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll period' },
      { status: 500 }
    )
  }
}
