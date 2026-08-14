import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

function canManage(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageEmployees
}

// DELETE /api/vehicle-service/contractors/[contractorId]/services/[serviceId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string; serviceId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId, serviceId } = await params
    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      select: { businessId: true },
    })
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    if (!canManage(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.vehicleServiceContractorServices.deleteMany({ where: { id: serviceId, contractorId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete contractor service error:', error)
    return NextResponse.json({ error: 'Failed to remove authorized service' }, { status: 500 })
  }
}
