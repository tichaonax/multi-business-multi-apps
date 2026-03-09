import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

const VALID_PURPOSES = ['Lodging', 'Meals', 'Incidentals', 'Travel', 'Other']

/**
 * GET /api/per-diem/entries
 * List per diem entries. Filters: employeeId, businessId, payrollYear, payrollMonth
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canAccessPerDiem') && !hasPermission(user, 'canAccessPayroll') && !isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const businessId = searchParams.get('businessId')
    const payrollYear = searchParams.get('payrollYear')
    const payrollMonth = searchParams.get('payrollMonth')

    const where: any = {}
    if (employeeId) where.employeeId = employeeId
    if (businessId) where.businessId = businessId
    if (payrollYear) where.payrollYear = parseInt(payrollYear)
    if (payrollMonth) where.payrollMonth = parseInt(payrollMonth)

    const entries = await prisma.perDiemEntries.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            job_titles: { select: { title: true } },
          },
        },
        cashier: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ payrollYear: 'desc' }, { payrollMonth: 'desc' }, { date: 'asc' }],
    })

    const mapped = entries.map((e: any) => ({
      id: e.id,
      employeeId: e.employeeId,
      businessId: e.businessId,
      enteredBy: e.enteredBy,
      date: e.date.toISOString(),
      amount: Number(e.amount),
      purpose: e.purpose,
      notes: e.notes,
      payrollMonth: e.payrollMonth,
      payrollYear: e.payrollYear,
      createdAt: e.createdAt.toISOString(),
      employee: {
        id: e.employee.id,
        employeeNumber: e.employee.employeeNumber,
        fullName: e.employee.fullName,
        jobTitle: e.employee.job_titles?.title ?? null,
      },
      cashier: e.cashier,
    }))

    return NextResponse.json({ data: { entries: mapped, total: mapped.length } })
  } catch (err) {
    console.error('[per-diem entries GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/per-diem/entries
 * Batch create per diem entries for one employee.
 * Body: { employeeId, businessId, payrollMonth, payrollYear, entries: [{ date, amount, purpose, notes? }] }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canAccessPerDiem') && !hasPermission(user, 'canAccessPayroll') && !isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { employeeId, businessId, payrollMonth, payrollYear, entries } = body

    if (!employeeId || !businessId) {
      return NextResponse.json({ error: 'employeeId and businessId are required' }, { status: 400 })
    }
    if (!payrollMonth || !payrollYear || payrollMonth < 1 || payrollMonth > 12) {
      return NextResponse.json({ error: 'Valid payrollMonth (1–12) and payrollYear are required' }, { status: 400 })
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'At least one entry is required' }, { status: 400 })
    }

    // Validate each row
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      if (!e.date) return NextResponse.json({ error: `Row ${i + 1}: date is required` }, { status: 400 })
      if (!e.amount || Number(e.amount) <= 0) return NextResponse.json({ error: `Row ${i + 1}: amount must be greater than 0` }, { status: 400 })
      if (!e.purpose || !VALID_PURPOSES.includes(e.purpose)) {
        return NextResponse.json({ error: `Row ${i + 1}: purpose must be one of ${VALID_PURPOSES.join(', ')}` }, { status: 400 })
      }
      // Validate date falls within the payroll month/year
      const d = new Date(e.date)
      if (d.getFullYear() !== payrollYear || d.getMonth() + 1 !== payrollMonth) {
        return NextResponse.json({ error: `Row ${i + 1}: date must be within ${payrollYear}-${String(payrollMonth).padStart(2, '0')}` }, { status: 400 })
      }
    }

    // Verify employee and business exist
    const [employee, business] = await Promise.all([
      prisma.employees.findUnique({ where: { id: employeeId }, select: { id: true, fullName: true } }),
      prisma.businesses.findUnique({ where: { id: businessId }, select: { id: true } }),
    ])
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    // Batch create in a single transaction
    const created = await prisma.$transaction(
      entries.map((e: any) =>
        prisma.perDiemEntries.create({
          data: {
            employeeId,
            businessId,
            enteredBy: user.id,
            date: new Date(e.date),
            amount: Number(e.amount),
            purpose: e.purpose,
            notes: e.notes?.trim() || null,
            payrollMonth: parseInt(payrollMonth),
            payrollYear: parseInt(payrollYear),
          },
        })
      )
    )

    const total = created.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

    return NextResponse.json({
      data: {
        created: created.length,
        total,
        employeeName: employee.fullName,
        payrollMonth,
        payrollYear,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[per-diem entries POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
