import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * POST /api/petty-cash/requests/[requestId]/cancel
 * Cancel a PENDING petty cash request. Only the requester or an admin can cancel.
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
    })
    if (!pcRequest) return NextResponse.json({ error: 'Petty cash request not found' }, { status: 404 })

    if (pcRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Only PENDING requests can be cancelled. Current status: ${pcRequest.status}` },
        { status: 400 }
      )
    }

    // Only the requester or an admin can cancel
    if (!isSystemAdmin(user) && pcRequest.requestedBy !== user.id) {
      return NextResponse.json({ error: 'Only the requester or an admin can cancel this request' }, { status: 403 })
    }

    const updated = await prisma.pettyCashRequests.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        cancelledBy: user.id,
        cancelledAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Petty cash request cancelled',
      data: { request: { id: updated.id, status: updated.status, cancelledAt: updated.cancelledAt?.toISOString() } },
    })
  } catch (error) {
    console.error('Error cancelling petty cash request:', error)
    return NextResponse.json({ error: 'Failed to cancel petty cash request' }, { status: 500 })
  }
}
