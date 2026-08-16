import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { createAuditLog } from '@/lib/audit'

function canManage(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageEmployees
}

// POST /api/vehicle-service/contractors/[contractorId]/reactivate-login
// Body: { notes? }
// Restores a previously revoked contractor portal login — mirrors
// /api/admin/users/[userId]/reactivate, scoped to contractor managers.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId } = await params
    const body = await request.json().catch(() => ({}))
    const { notes } = body as { notes?: string }

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      include: { persons: { select: { fullName: true } }, users: { select: { id: true, isActive: true, email: true } } },
    })
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    if (!canManage(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!contractor.users) {
      return NextResponse.json({ error: 'This contractor has no login to reactivate' }, { status: 400 })
    }
    if (contractor.users.isActive) {
      return NextResponse.json({ error: 'This login is already active' }, { status: 409 })
    }

    const updatedUser = await prisma.users.update({
      where: { id: contractor.users.id },
      data: {
        isActive: true,
        reactivatedAt: new Date(),
        reactivatedBy: user.id,
        reactivationNotes: notes?.trim() || null,
        deactivatedAt: null,
        deactivatedBy: null,
        deactivationReason: null,
        deactivationNotes: null,
      },
      select: { id: true, email: true, isActive: true, reactivatedAt: true },
    })

    await createAuditLog({
      userId: user.id,
      action: 'ACCOUNT_UNLOCKED',
      entityType: 'User',
      entityId: contractor.users.id,
      metadata: {
        businessId: contractor.businessId,
        contractorId: contractor.id,
        contractorName: contractor.persons.fullName,
        notes: notes?.trim() || undefined,
      },
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('Reactivate contractor login error:', error)
    return NextResponse.json({ error: 'Failed to reactivate login' }, { status: 500 })
  }
}
