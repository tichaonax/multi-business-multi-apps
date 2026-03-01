import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/clock-in/card-scan
// PUBLIC — no authentication required.
// Called from the login screen when an employee scans their ID card.
// Clocks the employee in if needed, and reports whether they can also log in.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const scanToken = String(body.scanToken ?? '').trim()
    if (!scanToken) {
      return NextResponse.json({ found: false, error: 'scanToken required' }, { status: 400 })
    }

    // Find the active employee by scanToken
    const employee = await prisma.employees.findFirst({
      where: { scanToken, isActive: true },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        profilePhotoUrl: true,
        isClockInExempt: true,
        users: {
          select: { id: true, isActive: true },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ found: false, error: 'Card not recognised' })
    }

    // Can this employee log into the app?
    const canLogin = !!(employee.users && employee.users.isActive)

    // Clock-in logic — only for non-exempt employees
    let clockedIn = false
    let alreadyClockedIn = false
    let clockInTime: Date | null = null

    if (!employee.isClockInExempt) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const existing = await prisma.employeeAttendance.findFirst({
        where: {
          employeeId: employee.id,
          date: { gte: todayStart, lte: todayEnd },
        },
        select: { id: true, checkIn: true, checkOut: true },
      })

      if (existing) {
        // Already clocked out (both checkIn and checkOut set)
        if (existing.checkIn && existing.checkOut) {
          return NextResponse.json({
            found: true,
            canLogin,
            employee: {
              id: employee.id,
              fullName: employee.fullName,
              profilePhotoUrl: employee.profilePhotoUrl,
              employeeNumber: employee.employeeNumber,
            },
            isExempt: false,
            clockedIn: false,
            alreadyClockedIn: false,
            clockedOut: true,
            clockInTime: existing.checkIn?.toISOString() ?? null,
            attendanceId: null,
          })
        }
        alreadyClockedIn = true
        clockInTime = existing.checkIn
      } else {
        const now = new Date()
        const dateOnly = new Date()
        dateOnly.setHours(0, 0, 0, 0)

        const newRecord = await prisma.employeeAttendance.create({
          data: {
            employeeId: employee.id,
            date: dateOnly,
            checkIn: now,
            status: 'present',
          },
        })

        clockedIn = true
        clockInTime = now
        // Store so caller can attach a clock-in photo
        ;(employee as any)._attendanceId = newRecord.id
      }
    }

    return NextResponse.json({
      found: true,
      canLogin,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        profilePhotoUrl: employee.profilePhotoUrl,
        employeeNumber: employee.employeeNumber,
      },
      isExempt: employee.isClockInExempt,
      clockedIn,
      alreadyClockedIn,
      clockedOut: false,
      clockInTime: clockInTime?.toISOString() ?? null,
      attendanceId: (employee as any)._attendanceId ?? null,
    })
  } catch (error) {
    console.error('Card scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
