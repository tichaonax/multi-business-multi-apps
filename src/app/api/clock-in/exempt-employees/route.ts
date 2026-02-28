import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// Job title levels that are automatically exempt from clock-in
const MANAGER_LEVELS = ['manager', 'senior', 'executive']

// GET /api/clock-in/exempt-employees?businessId=
// Returns active employees who are exempt from clock-in.
// Includes: (a) manually flagged isClockInExempt=true, (b) auto-exempt by management job title level
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
        ...(businessId ? { primaryBusinessId: businessId } : {}),
        // Exempt if manually flagged OR job title is a management level
        OR: [
          { isClockInExempt: true },
          { job_titles: { level: { in: MANAGER_LEVELS, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        profilePhotoUrl: true,
        phone: true,
        isClockInExempt: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        clockInExemptReason: true,
        businesses: { select: { id: true, name: true, phone: true, umbrellaBusinessPhone: true } },
        job_titles: { select: { title: true, department: true, level: true } },
      },
      orderBy: { fullName: 'asc' },
    })

    // Fetch umbrella business phone once as final fallback for ID cards
    const umbrellaBiz = await prisma.businesses.findFirst({
      where: { isUmbrellaBusiness: true },
      select: { umbrellaBusinessPhone: true },
    })
    const umbrellaPhone = umbrellaBiz?.umbrellaBusinessPhone ?? null

    const result = employees.map((emp: any) => {
      const level = emp.job_titles?.level?.toLowerCase() ?? ''
      const isAutoExempt = !emp.isClockInExempt && MANAGER_LEVELS.includes(level)
      return {
        id: emp.id,
        fullName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        profilePhotoUrl: emp.profilePhotoUrl,
        phone: emp.phone,
        // Phone priority: business phone → business umbrella phone → umbrella record phone
        businessContactPhone:
          emp.businesses?.phone ||
          emp.businesses?.umbrellaBusinessPhone ||
          umbrellaPhone ||
          null,
        isClockInExempt: emp.isClockInExempt,
        isAutoExempt,
        clockInExemptReason: isAutoExempt
          ? `Auto-exempt: ${emp.job_titles?.title ?? 'management role'}`
          : emp.clockInExemptReason,
        scheduledStartTime: emp.scheduledStartTime,
        scheduledEndTime: emp.scheduledEndTime,
        primaryBusiness: emp.businesses ?? null,
        jobTitle: emp.job_titles ?? null,
      }
    })

    return NextResponse.json({ employees: result })
  } catch (error) {
    console.error('Exempt employees error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
