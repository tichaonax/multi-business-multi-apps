import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/employees/absences/summary?businessId=&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns absence day counts per employee for a given date range.
 * Used by the payroll entries route to auto-populate absenceDays.
 * Response: { [employeeId: string]: number }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canManageEmployees') && !hasPermission(user, 'canEditEmployees') && !hasPermission(user, 'canAccessPayroll') && !isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    if (!businessId || !fromParam || !toParam) {
      return NextResponse.json({ error: 'businessId, from, and to are required' }, { status: 400 })
    }

    const from = new Date(fromParam + 'T00:00:00.000Z')
    const to = new Date(toParam + 'T00:00:00.000Z')

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    const records = await prisma.employeeAbsences.findMany({
      where: {
        businessId,
        date: { gte: from, lte: to },
      },
      select: { employeeId: true },
    })

    // Count per employee
    const summary: Record<string, number> = {}
    for (const r of records) {
      summary[r.employeeId] = (summary[r.employeeId] ?? 0) + 1
    }

    return NextResponse.json(summary)
  } catch (err) {
    console.error('[employees/absences/summary GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
