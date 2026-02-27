import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/clock-in/exempt-employees?businessId=
// Returns active employees who are exempt from clock-in (managers, directors, etc.)
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')

    const employees = await prisma.employees.findMany({
      where: {
        isActive: true,
        isClockInExempt: true,
        ...(businessId ? { primaryBusinessId: businessId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        profilePhotoUrl: true,
        phone: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        clockInExemptReason: true,
        businesses: { select: { id: true, name: true } },
        job_titles: { select: { title: true, department: true } },
      },
      orderBy: { fullName: 'asc' },
    })

    const result = employees.map((emp) => ({
      id: emp.id,
      fullName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      profilePhotoUrl: emp.profilePhotoUrl,
      phone: emp.phone,
      scheduledStartTime: emp.scheduledStartTime,
      scheduledEndTime: emp.scheduledEndTime,
      clockInExemptReason: emp.clockInExemptReason,
      primaryBusiness: emp.businesses ?? null,
      jobTitle: emp.job_titles ?? null,
    }))

    return NextResponse.json({ employees: result })
  } catch (error) {
    console.error('Exempt employees error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
