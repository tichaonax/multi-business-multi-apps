import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/clock-in/monthly?businessId=&year=&month=&employeeId=
// Returns all active employees for a business + their attendance for a given month.
// If employeeId is provided, returns only that employee.
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const employeeId = searchParams.get('employeeId')
  const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))

  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  // Period range: full calendar month (server local time)
  const periodStart = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const periodEnd   = new Date(year, month,     0, 23, 59, 59, 999)

  // Fetch employees
  const employees = await prisma.employees.findMany({
    where: {
      primaryBusinessId: businessId,
      employmentStatus: { not: 'terminated' },
      ...(employeeId ? { id: employeeId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeNumber: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      scheduledDaysPerWeek: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })

  if (employees.length === 0) {
    return NextResponse.json({ employees: [] })
  }

  const empIds = employees.map((e: typeof employees[0]) => e.id)

  // Fetch all attendance records for these employees in the month
  const records = await prisma.employeeAttendance.findMany({
    where: {
      employeeId: { in: empIds },
      date: { gte: periodStart, lte: periodEnd },
    },
    select: {
      id: true,
      employeeId: true,
      date: true,
      checkIn: true,
      checkOut: true,
      hoursWorked: true,
      status: true,
    },
    orderBy: { date: 'asc' },
  })

  // Group records by employeeId
  const byEmployee: Record<string, typeof records> = {}
  for (const r of records) {
    if (!byEmployee[r.employeeId!]) byEmployee[r.employeeId!] = []
    byEmployee[r.employeeId!].push(r)
  }

  const result = employees.map((emp: typeof employees[0]) => ({
    id: emp.id,
    fullName: `${emp.firstName} ${emp.lastName}`.trim(),
    employeeNumber: emp.employeeNumber,
    scheduledStartTime: emp.scheduledStartTime,
    scheduledEndTime: emp.scheduledEndTime,
    scheduledDaysPerWeek: emp.scheduledDaysPerWeek,
    attendance: (byEmployee[emp.id] ?? ([] as typeof records)).map((r: typeof records[0]) => ({
      id: r.id,
      date: (r.date as Date).toISOString().split('T')[0],
      checkIn:  r.checkIn  ? (r.checkIn  as Date).toISOString() : null,
      checkOut: r.checkOut ? (r.checkOut as Date).toISOString() : null,
      hoursWorked: r.hoursWorked ? Number(r.hoursWorked) : null,
      status: r.status,
    })),
  }))

  return NextResponse.json({ employees: result, year, month })
}

// DELETE /api/clock-in/monthly?recordId=<attendanceId>
// Deletes a specific attendance record by ID.
export async function DELETE(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const recordId = searchParams.get('recordId')
  if (!recordId) return NextResponse.json({ error: 'recordId required' }, { status: 400 })

  await prisma.employeeAttendance.delete({ where: { id: recordId } })
  return NextResponse.json({ success: true })
}
