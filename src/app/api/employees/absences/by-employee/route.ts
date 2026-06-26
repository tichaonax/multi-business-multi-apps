import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * POST /api/employees/absences/by-employee
 * Save all absences for one employee across a full month.
 * Body: { employeeId, businessId, month, year, absentDates: string[] }
 * For each date in the month: upsert if in absentDates, delete if not.
 * Does NOT touch other employees' records for those dates.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canManageEmployees') && !hasPermission(user, 'canEditEmployees') && !isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { employeeId, businessId, month, year, absentDates } = body

    if (!employeeId || !businessId || !month || !year || !Array.isArray(absentDates)) {
      return NextResponse.json({ error: 'employeeId, businessId, month, year, and absentDates are required' }, { status: 400 })
    }

    // Block if payroll period is closed/exported
    const period = await prisma.payrollPeriods.findFirst({
      where: { businessId, year: parseInt(year), month: parseInt(month) },
      select: { status: true },
    })
    if (period && (period.status === 'closed' || period.status === 'exported')) {
      return NextResponse.json({ error: 'Payroll for this period has been processed. Absence records are locked.' }, { status: 403 })
    }

    // Build set of selected dates for fast lookup
    const selectedSet = new Set<string>(absentDates)

    // All days in the month
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
    const allDates: string[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      allDates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }

    // Fetch existing absence records for this employee in this month
    const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`)
    const endDate = new Date(parseInt(year), parseInt(month), 0)
    endDate.setUTCHours(23, 59, 59, 999)

    const existing = await prisma.employeeAbsences.findMany({
      where: { employeeId, businessId, date: { gte: startDate, lte: endDate } },
      select: { id: true, date: true },
    })
    const existingMap = new Map(existing.map(r => [r.date.toISOString().split('T')[0], r.id]))

    const toCreate: string[] = []
    const toDelete: string[] = []

    for (const dateStr of allDates) {
      const hasRecord = existingMap.has(dateStr)
      const wantsAbsent = selectedSet.has(dateStr)
      if (wantsAbsent && !hasRecord) toCreate.push(dateStr)
      if (!wantsAbsent && hasRecord) toDelete.push(existingMap.get(dateStr)!)
    }

    await prisma.$transaction([
      ...(toDelete.length > 0 ? [prisma.employeeAbsences.deleteMany({ where: { id: { in: toDelete } } })] : []),
      ...(toCreate.length > 0 ? [prisma.employeeAbsences.createMany({
        data: toCreate.map(dateStr => ({
          employeeId,
          businessId,
          date: new Date(dateStr + 'T00:00:00.000Z'),
          recordedBy: user.id,
        })),
      })] : []),
    ])

    return NextResponse.json({ saved: toCreate.length, removed: toDelete.length })
  } catch (err) {
    console.error('[absences/by-employee POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
