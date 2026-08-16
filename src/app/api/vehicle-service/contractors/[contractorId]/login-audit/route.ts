import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getEntityAuditTrail } from '@/lib/audit'

function canManage(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageEmployees
}

// GET /api/vehicle-service/contractors/[contractorId]/login-audit
// History of login create/revoke/reactivate events for this contractor,
// from the app's shared audit_logs table (see src/lib/audit.ts) — not a
// separate vehicle-service-specific log.
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
      select: { businessId: true, userId: true },
    })
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    if (!canManage(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!contractor.userId) return NextResponse.json({ entries: [] })

    const entries = await getEntityAuditTrail('User', contractor.userId, 20)
    return NextResponse.json({
      entries: entries.map(e => ({
        id: e.id,
        action: e.action,
        timestamp: e.timestamp,
        performedBy: e.users ? { name: e.users.name, email: e.users.email } : null,
        reason: (e.metadata as any)?.reason ?? (e.metadata as any)?.notes ?? null,
      })),
    })
  } catch (error) {
    console.error('Contractor login audit error:', error)
    return NextResponse.json({ error: 'Failed to load login history' }, { status: 500 })
  }
}
