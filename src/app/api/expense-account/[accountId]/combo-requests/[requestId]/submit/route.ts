import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitNotification } from '@/lib/notifications/notification-emitter'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string; requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, requestId } = await params

    const comboRequest = await prisma.comboPaymentRequests.findFirst({
      where: { id: requestId, accountId },
      include: { sections: { include: { items: true } } },
    })
    if (!comboRequest) return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })
    if (comboRequest.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only DRAFT requests can be submitted' }, { status: 400 })
    }
    if (comboRequest.createdBy !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only the creator can submit this request' }, { status: 403 })
    }

    const now = new Date()
    const updated = await prisma.comboPaymentRequests.update({
      where: { id: requestId },
      data: { status: 'SUBMITTED', submittedAt: now },
    })

    // Notify cashiers/managers (non-blocking)
    try {
      const grants = await prisma.expenseAccountGrants.findMany({
        where: { expenseAccountId: accountId, permissionLevel: 'FULL' },
        select: { userId: true },
      })
      const cashierIds = grants.map(g => g.userId).filter(id => id !== user.id)
      if (cashierIds.length > 0) {
        await emitNotification({
          userIds: cashierIds,
          type: 'COMBO_REQUEST_SUBMITTED',
          title: 'New Combo Request',
          message: `${user.name} submitted "${comboRequest.title}" — $${Number(comboRequest.requestedAmount).toFixed(2)}`,
          linkUrl: `/expense-accounts/${accountId}/combo-requests/${requestId}`,
        })
      }
    } catch (notifErr) {
      console.error('Notification error (non-blocking):', notifErr)
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error submitting combo request:', error)
    return NextResponse.json({ error: 'Failed to submit combo request' }, { status: 500 })
  }
}
