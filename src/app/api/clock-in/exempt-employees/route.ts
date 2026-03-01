import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// Job title levels that are automatically exempt from clock-in
const MANAGER_LEVELS = ['manager', 'senior', 'executive']

// GET /api/clock-in/exempt-employees?businessId=
// Returns employees who are exempt from clock-in.
// (a) Manually flagged isClockInExempt=true — employee must be active
// (b) Auto-exempt by management job title level — shown as long as their USER login account is active,
//     regardless of whether the employee record itself is marked inactive (e.g. no current contract)
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
        ...(businessId ? { primaryBusinessId: businessId } : {}),
        OR: [
          // Management role: include regardless of employee.isActive — only requires active user login
          {
            job_titles: { level: { in: MANAGER_LEVELS, mode: 'insensitive' } },
            users: { isActive: true },
          },
          // Manually flagged exempt: employee record must be active
          {
            isClockInExempt: true,
            isActive: true,
          },
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
