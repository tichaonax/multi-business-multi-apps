import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string; requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, requestId } = await params
    const permissions = getEffectivePermissions(user)

    const comboRequest = await prisma.comboPaymentRequests.findFirst({
      where: { id: requestId, accountId },
    })
    if (!comboRequest) return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })

    if (!['DRAFT', 'SUBMITTED'].includes(comboRequest.status)) {
      return NextResponse.json({ error: 'Only DRAFT or SUBMITTED requests can be cancelled' }, { status: 400 })
    }

    const isCreator = comboRequest.createdBy === user.id
    const isAdmin = user.role === 'admin'
    const isCashier = permissions.canMakeExpensePayments

    if (!isCreator && !isAdmin && !isCashier) {
      return NextResponse.json({ error: 'You do not have permission to cancel this request' }, { status: 403 })
    }

    const updated = await prisma.comboPaymentRequests.update({
      where: { id: requestId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    })

    // Notify relevant parties (non-blocking)
    try {
      const notifyIds = new Set<string>()
      if (user.id !== comboRequest.createdBy) notifyIds.add(comboRequest.createdBy)

      const grants = await prisma.expenseAccountGrants.findMany({
        where: { expenseAccountId: accountId, permissionLevel: 'FULL' },
        select: { userId: true },
      })
      for (const g of grants) {
        if (g.userId !== user.id) notifyIds.add(g.userId)
      }

      if (notifyIds.size > 0) {
        await emitNotification({
          userIds: Array.from(notifyIds),
          type: 'COMBO_REQUEST_CANCELLED',
          title: 'Combo Request Cancelled',
          message: `Combo request "${comboRequest.title}" has been cancelled by ${user.name}`,
          linkUrl: `/expense-accounts/${accountId}/combo-requests/${requestId}`,
        })
      }
    } catch (notifErr) {
      console.error('Notification error (non-blocking):', notifErr)
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error cancelling combo request:', error)
    return NextResponse.json({ error: 'Failed to cancel combo request' }, { status: 500 })
  }
}
