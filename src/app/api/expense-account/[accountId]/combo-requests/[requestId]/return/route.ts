import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, requestId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canMakeExpensePayments && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only cashiers or admins can return combo requests' }, { status: 403 })
    }

    const comboRequest = await prisma.comboPaymentRequests.findFirst({
      where: { id: requestId, accountId },
    })
    if (!comboRequest) return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })

    if (comboRequest.createdBy === user.id) {
      return NextResponse.json({ error: 'You cannot return your own request' }, { status: 403 })
    }

    if (comboRequest.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Only SUBMITTED requests can be returned for edits' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const note = typeof body?.note === 'string' ? body.note.trim() : ''
    if (note.length < 10) {
      return NextResponse.json({ error: 'Return note must be at least 10 characters' }, { status: 400 })
    }

    const updated = await prisma.comboPaymentRequests.update({
      where: { id: requestId },
      data: {
        status: 'DRAFT',
        returnNote: note,
        returnedAt: new Date(),
        returnedBy: user.id,
      },
    })

    // Notify requester (non-blocking)
    try {
      await emitNotification({
        userIds: [comboRequest.createdBy],
        type: 'COMBO_REQUEST_RETURNED',
        title: 'Request Returned for Edits',
        message: `${user.name} returned "${comboRequest.title}" for edits: ${note}`,
        linkUrl: `/expense-accounts/${accountId}/combo-requests/${requestId}`,
      })
    } catch (notifErr) {
      console.error('Notification error (non-blocking):', notifErr)
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error returning combo request:', error)
    return NextResponse.json({ error: 'Failed to return combo request' }, { status: 500 })
  }
}
