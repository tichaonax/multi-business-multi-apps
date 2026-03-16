import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitNotification } from '@/lib/notifications/notification-emitter'

/**
 * POST /api/petty-cash/requests/sync-notifications
 *
 * Catch-all: for every PENDING petty cash request that has no existing
 * PETTY_CASH_SUBMITTED notification, create and emit one.
 * Safe to call on every page load — idempotent via metadata.requestId check.
 */
export async function POST() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Find all PENDING requests
    const pendingRequests = await prisma.pettyCashRequests.findMany({
      where: { status: 'PENDING' },
      include: { requester: { select: { id: true, name: true } } },
    })

    if (pendingRequests.length === 0) {
      return NextResponse.json({ synced: 0 })
    }

    // Find all users who can approve
    const approverRecords = await prisma.userPermissions.findMany({
      where: { granted: true, permission: { name: 'petty_cash.approve' } },
      select: { userId: true },
    })
    const approverIds = [...new Set(approverRecords.map(r => r.userId))]

    let synced = 0

    for (const req of pendingRequests) {
      // Notify: the requester + all approvers
      const targetUserIds = [...new Set([req.requestedBy, ...approverIds])]

      for (const userId of targetUserIds) {
        // Check if this user already has a notification for this request
        const existing = await prisma.appNotification.findFirst({
          where: {
            userId,
            type: 'PETTY_CASH_SUBMITTED',
            metadata: { path: ['requestId'], equals: req.id },
          },
        })
        if (existing) continue

        // Create + emit the missing notification
        const channel = (req as any).paymentChannel === 'ECOCASH' ? '📱 EcoCash' : '💵 Cash'
        const isUrgent = (req as any).priority === 'URGENT'
        const urgentPrefix = isUrgent ? '🚨 URGENT — ' : ''
        await emitNotification({
          userIds: [userId],
          type: 'PETTY_CASH_SUBMITTED',
          title: isUrgent ? '🚨 Urgent Petty Cash Request' : 'Petty Cash Request',
          message: `${urgentPrefix}${req.requester?.name ?? 'Someone'} requested $${Number(req.requestedAmount).toFixed(2)} for ${req.purpose} [${channel}]`,
          linkUrl: '/petty-cash',
          metadata: { requestId: req.id, priority: (req as any).priority ?? 'NORMAL', paymentChannel: (req as any).paymentChannel ?? 'CASH' },
        })
        synced++
      }
    }

    return NextResponse.json({ synced })
  } catch (error) {
    console.error('[petty-cash sync-notifications]', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
