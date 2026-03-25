import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/employees/pos-selector?businessId=xxx
 *
 * Lightweight endpoint for the POS salesperson selector.
 * Any authenticated user can call this — no canViewEmployees permission required.
 * Returns active employees for the business (by primaryBusinessId or assignment).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    // Employees for this business: either primary business or an active assignment
    const employees = await prisma.employees.findMany({
      where: {
        isActive: true,
        OR: [
          { primaryBusinessId: businessId },
          {
            employee_business_assignments: {
              some: { businessId, isActive: true }
            }
          }
        ]
      },
      select: {
        id: true,
        fullName: true,
        profilePhotoUrl: true,
        userId: true,
        job_titles: {
          select: { title: true }
        }
      },
      orderBy: { fullName: 'asc' },
    })

    return NextResponse.json({ employees })
  } catch (err) {
    console.error('[pos-selector] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
