import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

// GET /api/vehicle-service/contractors/eligible?businessId=&subcategoryId=
// Active contractors authorized (with a fee) for the given service. Powers the
// task-assignment picker — retired/disabled contractors never appear here.
// Returns feeAmount (a labour charge), so this requires business membership —
// contractors (who have none) are correctly denied.
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const subcategoryId = searchParams.get('subcategoryId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!subcategoryId) return NextResponse.json({ error: 'subcategoryId is required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    const authorizations = await prisma.vehicleServiceContractorServices.findMany({
      where: {
        subcategoryId,
        isActive: true,
        contractor: { businessId, status: 'active' },
      },
      select: {
        feeAmount: true,
        contractor: { select: { id: true, persons: { select: { fullName: true } } } },
      },
      orderBy: { contractor: { persons: { fullName: 'asc' } } },
    })

    return NextResponse.json({
      contractors: authorizations.map(a => ({
        contractorId: a.contractor.id,
        fullName: a.contractor.persons.fullName,
        feeAmount: a.feeAmount,
      })),
    })
  } catch (error) {
    console.error('Eligible contractors error:', error)
    return NextResponse.json({ error: 'Failed to load eligible contractors' }, { status: 500 })
  }
}
