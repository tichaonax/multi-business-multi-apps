import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/per-diem/form/[employeeId]
 * Returns all data needed to render the printable per diem claim form.
 * Query params: payrollMonth, payrollYear, businessId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canAccessPerDiem') && !hasPermission(user, 'canAccessPayroll') && !isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { employeeId } = await params
    const { searchParams } = new URL(request.url)
    const payrollMonth = parseInt(searchParams.get('payrollMonth') || '0')
    const payrollYear = parseInt(searchParams.get('payrollYear') || '0')
    const businessId = searchParams.get('businessId')

    if (!payrollMonth || !payrollYear) {
      return NextResponse.json({ error: 'payrollMonth and payrollYear are required' }, { status: 400 })
    }

    const [employee, entries] = await Promise.all([
      prisma.employees.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          employeeNumber: true,
          fullName: true,
          firstName: true,
          lastName: true,
          job_titles: { select: { title: true } },
          businesses: { select: { id: true, name: true } },
        },
      }),
      prisma.perDiemEntries.findMany({
        where: {
          employeeId,
          payrollMonth,
          payrollYear,
          ...(businessId ? { businessId } : {}),
        },
        include: {
          cashier: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
      }),
    ])

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    const total = entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

    return NextResponse.json({
      data: {
        employee: {
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          fullName: employee.fullName,
          jobTitle: (employee as any).job_titles?.title ?? null,
          business: employee.businesses
            ? { id: employee.businesses.id, name: employee.businesses.name }
            : null,
        },
        period: { month: payrollMonth, year: payrollYear },
        entries: entries.map((e: any) => ({
          id: e.id,
          date: e.date.toISOString(),
          amount: Number(e.amount),
          purpose: e.purpose,
          notes: e.notes,
          cashier: e.cashier,
        })),
        total,
      },
    })
  } catch (err) {
    console.error('[per-diem form GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
