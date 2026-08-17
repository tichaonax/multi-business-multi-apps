import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

// GET /api/vehicle-service/vehicle-suggestions?businessId=
// Distinct vehicle make/model values already used at this business — powers
// autocomplete on the New Job form. No separate catalog to maintain: typing a
// new value on a job is itself how it "gets added" for future suggestions.
//
// `pairs` gives each distinct (make, model) combination actually seen together,
// so the UI can scope the Model picker to whichever Make is currently selected —
// a model can only ever be added attached to a make, never on its own.
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    const [makes, pairs] = await Promise.all([
      prisma.vehicleServiceJobs.findMany({
        where: { businessId, vehicleMake: { not: null } },
        select: { vehicleMake: true },
        distinct: ['vehicleMake'],
      }),
      prisma.vehicleServiceJobs.findMany({
        where: { businessId, vehicleMake: { not: null }, vehicleModel: { not: null } },
        select: { vehicleMake: true, vehicleModel: true },
        distinct: ['vehicleMake', 'vehicleModel'],
      }),
    ])

    return NextResponse.json({
      makes: makes.map(m => m.vehicleMake).filter(Boolean).sort(),
      pairs: pairs
        .filter(p => p.vehicleMake && p.vehicleModel)
        .map(p => ({ make: p.vehicleMake as string, model: p.vehicleModel as string }))
        .sort((a, b) => a.model.localeCompare(b.model)),
    })
  } catch (error) {
    console.error('Vehicle suggestions error:', error)
    return NextResponse.json({ error: 'Failed to load vehicle suggestions' }, { status: 500 })
  }
}
