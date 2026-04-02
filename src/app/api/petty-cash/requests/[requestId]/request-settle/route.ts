import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitNotification } from '@/lib/notifications/notification-emitter'

/**
 * POST /api/petty-cash/requests/[requestId]/request-settle
 * Called by the requester to signal they are ready to settle.
 * Does NOT settle the request — notifies approvers to perform the actual settlement.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { requestId } = await params

    const pcRequest = await prisma.pettyCashRequests.findUnique({
      where: { id: requestId },
      select: { id: true, requestedBy: true, status: true, approvedAmount: true, purpose: true },
    })
    if (!pcRequest) return NextResponse.json({ error: 'Petty cash request not found' }, { status: 404 })

    if (pcRequest.requestedBy !== user.id) {
      return NextResponse.json({ error: 'Only the requester can submit a settlement request' }, { status: 403 })
    }

    if (pcRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Only APPROVED requests can request settlement. Current status: ${pcRequest.status}` },
        { status: 400 }
      )
    }

    // Find all users with petty_cash.approve permission
    const approverRecords = await prisma.userPermissions.findMany({
      where: { granted: true, permission: { name: 'petty_cash.approve' } },
      select: { userId: true },
    })
    const approverIds = approverRecords.map(r => r.userId)

    if (approverIds.length > 0) {
      const amount = Number(pcRequest.approvedAmount)
      await emitNotification({
        userIds: approverIds,
        type: 'PETTY_CASH_SETTLE_REQUESTED',
        title: 'Settlement Requested',
        message: `${user.name} is ready to settle their petty cash request for $${amount.toFixed(2)} (${pcRequest.purpose})`,
        linkUrl: `/petty-cash/${requestId}`,
      })
    }

    return NextResponse.json({ success: true, message: 'Settlement request submitted. An approver will complete the settlement.' })
  } catch (err) {
    console.error('request-settle error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
