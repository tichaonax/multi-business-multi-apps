import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'

function canManageInventory(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageInventory
}

// POST /api/vehicle-service/parts-requests/[requestId]/reject
// Body: { reason }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { requestId } = await params
    const body = await request.json()
    const { reason } = body as { reason?: string }
    if (!reason || !reason.trim()) return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })

    const partsRequest = await prisma.vehicleServicePartsRequests.findUnique({
      where: { id: requestId },
      include: { job: { select: { businessId: true } } },
    })
    if (!partsRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    if (!isSystemAdmin(user) && !canManageInventory(user, partsRequest.job.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (partsRequest.status !== 'REQUESTED') {
      return NextResponse.json({ error: `This request has already been ${partsRequest.status.toLowerCase()}` }, { status: 409 })
    }

    await prisma.vehicleServicePartsRequests.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reject parts request error:', error)
    return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 })
  }
}
