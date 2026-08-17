import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

function canManage(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageEmployees
}

// GET /api/vehicle-service/contractors?businessId=&status=
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status') || undefined
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!canManage(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const contractors = await prisma.vehicleServiceContractors.findMany({
      where: { businessId, ...(status ? { status } : {}) },
      select: {
        id: true,
        status: true,
        notes: true,
        createdAt: true,
        persons: { select: { id: true, fullName: true, phone: true, email: true } },
        users: { select: { id: true, email: true } },
        _count: { select: { skills: true, services: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      contractors: contractors.map(c => ({
        id: c.id,
        status: c.status,
        notes: c.notes,
        createdAt: c.createdAt,
        personId: c.persons.id,
        fullName: c.persons.fullName,
        phone: c.persons.phone,
        email: c.persons.email,
        hasLogin: !!c.users,
        loginEmail: c.users?.email ?? null,
        skillCount: c._count.skills,
        serviceCount: c._count.services,
      })),
    })
  } catch (error) {
    console.error('List vehicle service contractors error:', error)
    return NextResponse.json({ error: 'Failed to list contractors' }, { status: 500 })
  }
}

// POST /api/vehicle-service/contractors
// Body: { businessId, personId, notes? }
// The Persons row must already exist — create it first via POST /api/persons.
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, personId, notes } = body as { businessId?: string; personId?: string; notes?: string }

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!personId) return NextResponse.json({ error: 'personId is required' }, { status: 400 })

    if (!canManage(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const person = await prisma.persons.findUnique({ where: { id: personId }, select: { id: true } })
    if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 })

    const existing = await prisma.vehicleServiceContractors.findUnique({ where: { personId } })
    if (existing) {
      return NextResponse.json({ error: 'This person is already registered as a contractor' }, { status: 409 })
    }

    const contractor = await prisma.vehicleServiceContractors.create({
      data: {
        businessId,
        personId,
        notes: notes || null,
        createdBy: user.id,
      },
      include: { persons: { select: { fullName: true } } },
    })

    return NextResponse.json({ success: true, contractor })
  } catch (error) {
    console.error('Create vehicle service contractor error:', error)
    return NextResponse.json({ error: 'Failed to create contractor' }, { status: 500 })
  }
}
