import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { createAuditLog } from '@/lib/audit'

function canManage(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageEmployees
}

// POST /api/vehicle-service/contractors/[contractorId]/revoke-login
// Body: { reason? }
// Disables the contractor's portal login without deleting it — same
// isActive/deactivatedAt/deactivatedBy mechanism the admin user-management
// screen already uses (see /api/admin/users/[userId]/deactivate), just
// scoped to whoever already manages contractors for this business rather
// than system admin only. The Person/Contractor record and their work
// history are completely untouched; only sign-in is blocked.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId } = await params
    const body = await request.json().catch(() => ({}))
    const { reason } = body as { reason?: string }

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      include: { persons: { select: { fullName: true } }, users: { select: { id: true, isActive: true, email: true } } },
    })
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    if (!canManage(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!contractor.users) {
      return NextResponse.json({ error: 'This contractor has no login to revoke' }, { status: 400 })
    }
    if (!contractor.users.isActive) {
      return NextResponse.json({ error: 'This login is already revoked' }, { status: 409 })
    }

    const updatedUser = await prisma.users.update({
      where: { id: contractor.users.id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: user.id,
        deactivationReason: reason?.trim() || 'Contractor portal access revoked',
        deactivationNotes: null,
        reactivatedAt: null,
        reactivatedBy: null,
        reactivationNotes: null,
      },
      select: { id: true, email: true, isActive: true, deactivatedAt: true, deactivationReason: true },
    })

    await createAuditLog({
      userId: user.id,
      action: 'ACCOUNT_LOCKED',
      entityType: 'User',
      entityId: contractor.users.id,
      metadata: {
        businessId: contractor.businessId,
        contractorId: contractor.id,
        contractorName: contractor.persons.fullName,
        reason: reason?.trim() || 'Contractor portal access revoked',
      },
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('Revoke contractor login error:', error)
    return NextResponse.json({ error: 'Failed to revoke login' }, { status: 500 })
  }
}
