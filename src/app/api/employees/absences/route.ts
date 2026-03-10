import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/employees/absences?businessId=&date=YYYY-MM-DD
 * Returns the list of active employees for the business with their absence
 * status for the given date (pre-populated from DB records).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canManageEmployees') && !hasPermission(user, 'canEditEmployees') && !isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const dateParam = searchParams.get('date')

    if (!businessId || !dateParam) {
      return NextResponse.json({ error: 'businessId and date are required' }, { status: 400 })
    }

    // Parse date — store as a Date at midnight UTC to match @db.Date
    const date = new Date(dateParam + 'T00:00:00.000Z')
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    // Fetch active employees for this business
    const employees = await prisma.employees.findMany({
      where: {
        primaryBusinessId: businessId,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
      },
      orderBy: { fullName: 'asc' },
    })

    if (employees.length === 0) {
      return NextResponse.json([])
    }

    // Fetch existing absence records for this business on this date
    const absenceRecords = await prisma.employeeAbsences.findMany({
      where: {
        businessId,
        date,
      },
      select: {
        id: true,
        employeeId: true,
        notes: true,
      },
    })

    const absenceMap = new Map(absenceRecords.map((r) => [r.employeeId, r]))
    const batchNote = absenceRecords[0]?.notes ?? null

    const result = employees.map((emp) => {
      const record = absenceMap.get(emp.id)
      return {
        employeeId: emp.id,
        fullName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        isAbsent: !!record,
        absenceId: record?.id ?? null,
      }
    })

    return NextResponse.json({ employees: result, batchNote })
  } catch (err) {
    console.error('[employees/absences GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/employees/absences
 * Bulk-save absences for a given date (idempotent).
 * Deletes existing records for (businessId, date) and inserts new ones.
 * Body: { businessId, date, absentEmployeeIds: string[], notes?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canManageEmployees') && !hasPermission(user, 'canEditEmployees') && !isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { businessId, date: dateParam, absentEmployeeIds, notes } = body

    if (!businessId || !dateParam || !Array.isArray(absentEmployeeIds)) {
      return NextResponse.json({ error: 'businessId, date, and absentEmployeeIds are required' }, { status: 400 })
    }

    const date = new Date(dateParam + 'T00:00:00.000Z')
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    // Block edits if the payroll period covering this date is closed/exported
    const dateObj = new Date(dateParam)
    const year = dateObj.getUTCFullYear()
    const month = dateObj.getUTCMonth() + 1

    const period = await prisma.payrollPeriods.findFirst({
      where: {
        businessId,
        year,
        month,
      },
      select: { status: true },
    })

    if (period && (period.status === 'closed' || period.status === 'exported')) {
      return NextResponse.json(
        { error: 'Payroll for this period has been processed. Absence records are locked.' },
        { status: 403 }
      )
    }

    // Idempotent replace: delete then insert in a transaction
    const [, insertResult] = await prisma.$transaction([
      prisma.employeeAbsences.deleteMany({
        where: { businessId, date },
      }),
      prisma.employeeAbsences.createMany({
        data: (absentEmployeeIds as string[]).map((employeeId) => ({
          businessId,
          employeeId,
          date,
          recordedBy: user.id,
          notes: notes ?? null,
        })),
      }),
    ])

    return NextResponse.json({ saved: insertResult.count, date: dateParam, note: notes ?? null })
  } catch (err) {
    console.error('[employees/absences POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
