import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { hasPermission } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
)
 {

    const { employeeId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params
    const url = new URL(request.url)
    const month = parseInt(url.searchParams.get('month') || new Date().getMonth().toString()) + 1
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString())

    // Check if user has permission to view employee attendance
    if (!await hasPermission(session.user, 'canViewEmployeeAttendance', employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get attendance records for the specified month/year
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const attendanceRecords = await prisma.employeeAttendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    })

    // Convert Decimal fields to numbers for JSON serialization
    const formattedRecords = attendanceRecords.map(record => ({
      ...record,
      hoursWorked: record.hoursWorked ? Number(record.hoursWorked) : null
    }))

    return NextResponse.json(formattedRecords)
  } catch (error) {
    console.error('Attendance fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
)
 {

    const { employeeId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params

    // Check if user has permission to manage employee attendance
    if (!await hasPermission(session.user, 'canManageEmployeeAttendance', employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const {
      date,
      status,
      checkIn,
      checkOut,
      hoursWorked,
      notes
    } = await request.json()

    if (!date || !status) {
      return NextResponse.json({ error: 'Date and status are required' }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'late', 'half-day', 'sick', 'vacation']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 })
    }

    // Check if employee exists and is active
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      select: { isActive: true, fullName: true }
    })

    if (!employee || !employee.isActive) {
      return NextResponse.json({ error: 'Employee not found or inactive' }, { status: 404 })
    }

    // Calculate hours worked if check-in and check-out are provided
    let calculatedHours = hoursWorked
    if (checkIn && checkOut && !hoursWorked) {
      const checkInTime = new Date(`${date}T${checkIn}`)
      const checkOutTime = new Date(`${date}T${checkOut}`)
      calculatedHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
    }

    // Create or update attendance record using Unchecked types to satisfy Prisma generated input types
    const attendanceCreateData: Prisma.EmployeeAttendanceUncheckedCreateInput = {
      id: randomUUID(),
      employeeId,
      date: new Date(date),
      status,
      checkIn: checkIn ? new Date(`${date}T${checkIn}`) : null,
      checkOut: checkOut ? new Date(`${date}T${checkOut}`) : null,
      hoursWorked: calculatedHours ? new Prisma.Decimal(Number(calculatedHours)) : null,
      notes: notes || null,
      createdAt: new Date()
    }

    const attendanceUpdateData: Prisma.EmployeeAttendanceUncheckedUpdateInput = {
      status: status || undefined,
      checkIn: checkIn ? new Date(`${date}T${checkIn}`) : undefined,
      checkOut: checkOut ? new Date(`${date}T${checkOut}`) : undefined,
      hoursWorked: calculatedHours ? new Prisma.Decimal(Number(calculatedHours)) : undefined,
      notes: notes || undefined
    }

    const attendanceRecord = await prisma.employeeAttendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: new Date(date)
        }
      },
      update: attendanceUpdateData as any,
      create: attendanceCreateData as any
    })

    // Convert Decimal fields for JSON response
    const formattedRecord = {
      ...attendanceRecord,
      hoursWorked: attendanceRecord.hoursWorked ? Number(attendanceRecord.hoursWorked) : null
    }

    return NextResponse.json(formattedRecord)
  } catch (error) {
    console.error('Attendance creation error:', error)
    return NextResponse.json({ error: 'Failed to create attendance record' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
)
 {

    const { employeeId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params

    // Check if user has permission to manage employee attendance
    if (!await hasPermission(session.user, 'canManageEmployeeAttendance', employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const {
      attendanceId,
      date,
      status,
      checkIn,
      checkOut,
      hoursWorked,
      notes
    } = await request.json()

    if (!attendanceId) {
      return NextResponse.json({ error: 'Attendance ID is required' }, { status: 400 })
    }

    // Calculate hours worked if check-in and check-out are provided
    let calculatedHours = hoursWorked
    if (checkIn && checkOut && !hoursWorked) {
      const checkInTime = new Date(`${date}T${checkIn}`)
      const checkOutTime = new Date(`${date}T${checkOut}`)
      calculatedHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
    }

    const attendanceRecord = await prisma.employeeAttendance.update({
      where: { id: attendanceId },
      data: {
        status: status || undefined,
        checkIn: checkIn ? new Date(`${date}T${checkIn}`) : undefined,
        checkOut: checkOut ? new Date(`${date}T${checkOut}`) : undefined,
        hoursWorked: calculatedHours ? Number(calculatedHours) : undefined,
        notes: notes || undefined
      }
    })

    // Convert Decimal fields for JSON response
    const formattedRecord = {
      ...attendanceRecord,
      hoursWorked: attendanceRecord.hoursWorked ? Number(attendanceRecord.hoursWorked) : null
    }

    return NextResponse.json(formattedRecord)
  } catch (error) {
    console.error('Attendance update error:', error)
    return NextResponse.json({ error: 'Failed to update attendance record' }, { status: 500 })
  }
}