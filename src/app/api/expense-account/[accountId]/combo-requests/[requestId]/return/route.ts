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
    const typedNote = typeof body?.note === 'string' ? body.note.trim() : ''
    // MBM-335: the overall note is optional when items are flagged (the
    // flags say what to fix); otherwise it is required as before
    const openFlags = await prisma.comboPaymentRequestItems.count({
      where: { requestId, flagNote: { not: null }, flagResolvedAt: null },
    })
    if (openFlags === 0 && typedNote.length < 10) {
      return NextResponse.json({ error: 'Return note must be at least 10 characters (or flag the items that need fixing)' }, { status: 400 })
    }
    const flagSummary = openFlags > 0 ? `${openFlags} item${openFlags === 1 ? '' : 's'} flagged` : ''
    const note = typedNote || `Please fix the flagged item${openFlags === 1 ? '' : 's'} (${flagSummary}).`

    const now = new Date()
    const [updated] = await prisma.$transaction([
      prisma.comboPaymentRequests.update({
        where: { id: requestId },
        data: {
          status: 'DRAFT',
          returnNote: note,
          returnedAt: now,
          returnedBy: user.id,
        },
      }),
      // MBM-333: keep every return, not just the latest
      prisma.comboPaymentRequestReturns.create({
        data: { requestId, note, returnedBy: user.id, returnedAt: now },
      }),
    ])

    // Notify requester (non-blocking)
    try {
      await emitNotification({
        userIds: [comboRequest.createdBy],
        type: 'COMBO_REQUEST_RETURNED',
        title: 'Request Returned for Edits',
        message: `${user.name} returned "${comboRequest.title}" for edits${flagSummary ? ` — 🚩 ${flagSummary}` : ''}: ${note}`,
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
