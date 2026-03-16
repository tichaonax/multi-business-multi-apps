/**
 * Notification Emitter
 *
 * Server-side helper: persists a notification to the DB and pushes it
 * to all connected sockets for the target user(s) in real time.
 *
 * Usage (inside any API route, after a successful DB operation):
 *   await emitNotification({ userIds: [createdBy], type: 'PAYMENT_APPROVED', ... })
 */

import { prisma } from '@/lib/prisma'
import { emitToUser } from '@/lib/customer-display/socket-server'

export type NotificationType =
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'PAYMENT_PAID'
  | 'BATCH_READY'
  | 'PETTY_CASH_SUBMITTED'
  | 'PETTY_CASH_APPROVED'
  | 'PETTY_CASH_REJECTED'
  | 'CASH_ALLOC_RECONCILED'
  | 'CHAT_MESSAGE'

export interface NotificationPayload {
  userIds: string[]
  type: NotificationType
  title: string
  message: string
  linkUrl?: string
  metadata?: Record<string, unknown>
}

export async function emitNotification(payload: NotificationPayload): Promise<void> {
  const { userIds, type, title, message, linkUrl, metadata } = payload

  if (!userIds || userIds.length === 0) return

  // 30-day expiry
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  try {
    // Persist each notification to DB (one row per user)
    const created = await Promise.all(
      userIds.map(userId =>
        prisma.appNotification.create({
          data: { userId, type, title, message, linkUrl: linkUrl ?? null, metadata: metadata ?? null, expiresAt },
          select: { id: true, userId: true, type: true, title: true, message: true, linkUrl: true, createdAt: true },
        })
      )
    )

    // Push to each user's Socket.io room (non-blocking — fire and forget)
    for (const notif of created) {
      emitToUser(notif.userId, 'notification:new', {
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        linkUrl: notif.linkUrl,
        createdAt: notif.createdAt.toISOString(),
      })
    }
  } catch (err) {
    // Never throw — notifications are non-critical; log and continue
    console.error('[notification-emitter] Failed to emit notification:', err)
  }
}
