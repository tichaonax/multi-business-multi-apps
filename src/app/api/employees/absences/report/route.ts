import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/employees/absences/report
 * Query: businessId (optional – omit for all), from (YYYY-MM-DD), to (YYYY-MM-DD)
 * Returns full absence records with employee + business info for aggregation on client.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canManageEmployees') && !hasPermission(user, 'canEditEmployees') && !isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') // empty / 'all' = all businesses
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
    }

    // Use explicit UTC midnight to match how absence records are stored
    const fromDate = new Date(from + 'T00:00:00.000Z')
    const toDate = new Date(to + 'T00:00:00.000Z')

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    const where: any = {
      date: { gte: fromDate, lte: toDate },
    }
    if (businessId && businessId !== 'all') {
      where.businessId = businessId
    }

    const absences = await prisma.employeeAbsences.findMany({
      where,
      include: {
        employees: { select: { id: true, fullName: true, employeeNumber: true } },
        businesses: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({
      absences: absences.map(a => ({
        id: a.id,
        employeeId: a.employeeId,
        employeeName: a.employees?.fullName ?? 'Unknown',
        employeeNumber: a.employees?.employeeNumber ?? '',
        date: a.date.toISOString().split('T')[0],
        businessId: a.businessId,
        businessName: a.businesses?.name ?? '',
        notes: a.notes ?? null,
      })),
    })
  } catch (err) {
    console.error('[GET /api/employees/absences/report]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
