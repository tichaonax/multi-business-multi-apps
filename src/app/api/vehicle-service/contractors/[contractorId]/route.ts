import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

function canManage(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageEmployees
}

const VALID_STATUSES = ['active', 'retired', 'disabled']

// GET /api/vehicle-service/contractors/[contractorId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId } = await params
    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      include: {
        persons: true,
        users: { select: { id: true, email: true, isActive: true, deactivatedAt: true, deactivationReason: true, reactivatedAt: true } },
        skills: { orderBy: { createdAt: 'asc' } },
        services: {
          include: { subcategory: { select: { id: true, name: true, emoji: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })

    if (!canManage(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ contractor })
  } catch (error) {
    console.error('Get vehicle service contractor error:', error)
    return NextResponse.json({ error: 'Failed to fetch contractor' }, { status: 500 })
  }
}

// PATCH /api/vehicle-service/contractors/[contractorId]
// Body: { status?, notes? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId } = await params
    const body = await request.json()
    const { status, notes } = body as { status?: string; notes?: string }

    const existing = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      select: { businessId: true },
    })
    if (!existing) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })

    if (!canManage(user, existing.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const contractor = await prisma.vehicleServiceContractors.update({
      where: { id: contractorId },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
    })

    return NextResponse.json({ success: true, contractor })
  } catch (error) {
    console.error('Update vehicle service contractor error:', error)
    return NextResponse.json({ error: 'Failed to update contractor' }, { status: 500 })
  }
}
