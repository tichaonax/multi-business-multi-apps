import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// MBM-305: shared, user-extensible retirement-reason list — same pattern as
// /api/vehicles/issuing-authorities ("+ Add new reason", selected
// immediately once added, shared across all users).

// GET: list all retirement reasons
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reasons = await prisma.vehicleRetirementReasons.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isSystem: true },
    })

    return NextResponse.json({ success: true, data: reasons })
  } catch (error) {
    console.error('Error fetching vehicle retirement reasons:', error)
    return NextResponse.json({ error: 'Failed to fetch retirement reasons' }, { status: 500 })
  }
}

// POST: add a new retirement reason (or return the existing one if the name matches)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Reason name is required' }, { status: 400 })
    }

    const reason = await prisma.vehicleRetirementReasons.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true, name: true, isSystem: true },
    })

    return NextResponse.json({ success: true, data: reason })
  } catch (error) {
    console.error('Error creating vehicle retirement reason:', error)
    return NextResponse.json({ error: 'Failed to create retirement reason' }, { status: 500 })
  }
}
