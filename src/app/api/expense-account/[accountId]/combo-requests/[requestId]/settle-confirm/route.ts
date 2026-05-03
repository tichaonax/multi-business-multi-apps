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
      return NextResponse.json({ error: 'Only cashiers or admins can confirm settlement' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const settleNote: string | null = body?.note?.trim() || null

    const comboRequest = await prisma.comboPaymentRequests.findFirst({
      where: { id: requestId, accountId },
      include: {
        sections: { include: { items: true } },
      },
    })
    if (!comboRequest) return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })

    if (comboRequest.status !== 'SETTLE_REQUESTED') {
      return NextResponse.json({ error: 'Only SETTLE_REQUESTED requests can be confirmed' }, { status: 400 })
    }

    const now = new Date()

    await prisma.comboPaymentRequests.update({
      where: { id: requestId },
      data: {
        status: 'SETTLED',
        settleConfirmedAt: now,
        settledBy: user.id,
        settleNote: settleNote,
      },
    })

    // Notify the requester
    await emitNotification({
      userIds: [comboRequest.createdBy],
      type: 'COMBO_REQUEST_SETTLED',
      title: 'Change confirmed',
      message: `Your returned change has been confirmed by ${user.name} for "${comboRequest.title}"`,
      linkUrl: `/expense-accounts/${accountId}/combo-requests/${requestId}`,
      metadata: { requestId, accountId },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    console.error('[settle-confirm] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
