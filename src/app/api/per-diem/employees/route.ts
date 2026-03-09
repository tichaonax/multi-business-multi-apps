import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/per-diem/employees
 * Returns all active employees for use in per diem form dropdowns.
 * No businessId filter — shows all employees so cashiers/managers can pre-fill
 * forms for any employee regardless of which business is currently selected.
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isSystemAdmin(user) && !hasPermission(user, 'canAccessPerDiem') && !hasPermission(user, 'canAccessPayroll')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employees = await prisma.employees.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        job_titles: { select: { title: true } },
      },
      orderBy: { fullName: 'asc' },
    })

    return NextResponse.json({
      data: employees.map((e: (typeof employees)[number]) => ({
        id: e.id,
        fullName: e.fullName,
        employeeNumber: e.employeeNumber,
        jobTitle: e.job_titles?.title ?? null,
      })),
    })
  } catch (err) {
    console.error('[per-diem/employees GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
