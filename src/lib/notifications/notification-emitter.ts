/**
 * Notification Emitter
 *
 * Server-side helper: persists a notification to the DB and pushes it
 * to all connected sockets for the target user(s) in real time.
 *
 * Usage (inside any API route, after a successful DB operation):
 *   await emitNotification({ userIds: [createdBy], type: 'PAYMENT_APPROVED', ... })
 */

import { Prisma } from '@prisma/client'
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
  | 'PETTY_CASH_SETTLE_REQUESTED'
  | 'CASH_ALLOC_RECONCILED'
  | 'CHAT_MESSAGE'
  | 'PAYMENTS_REVERSED_TO_PETTY_CASH'
  | 'INVENTORY_ZERO_OUT'
  | 'LOW_STOCK'
  | 'COMBO_REQUEST_SUBMITTED'
  | 'COMBO_REQUEST_APPROVED'
  | 'COMBO_REQUEST_PARTIALLY_APPROVED'
  | 'COMBO_REQUEST_CANCELLED'
  | 'COMBO_REQUEST_PAID'
  | 'COMBO_REQUEST_RETURNED'
  | 'COMBO_REQUEST_SETTLE_REQUESTED'
  | 'COMBO_REQUEST_SETTLED'
  | 'COMBO_REQUEST_EXPIRING'
  | 'COMBO_REQUEST_EXPIRED'
  | 'WITHDRAWAL_SUBMITTED'
  | 'WITHDRAWAL_ADMIN_APPROVED'
  | 'WITHDRAWAL_DENIED_LENDER'
  | 'WITHDRAWAL_DENIED_ADMIN'
  | 'WITHDRAWAL_PAID'
  | 'WITHDRAWAL_CASHIER_ALERT'
  | 'JOB_BILLED_AWAITING_PAYMENT'
  | 'JOB_START_ESCALATION'
  | 'RECEIPT_REMINDER'
  | 'RECEIPT_ESCALATION'
  | 'PRICE_CHANGED'
  | 'ALLOCATION_SKIPPED'

export interface NotificationPayload {
  userIds: string[]
  type: NotificationType
  title: string
  message: string
  linkUrl?: string
  metadata?: Record<string, unknown>
}

export interface GroupedNotificationPayload {
  userId: string
  type: NotificationType
  title: string
  message: string
  linkUrl?: string
  metadata?: Record<string, unknown>
  // Recurring reminders for the same underlying thing (e.g. one payment's
  // outstanding receipts) share this key — a repeat firing refreshes the
  // existing row (bumps occurrenceCount, resets isRead) instead of creating
  // a new visible notification every time.
  groupKey: string
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
          data: { userId, type, title, message, linkUrl: linkUrl ?? null, metadata: metadata ?? Prisma.DbNull, expiresAt },
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

/**
 * Like emitNotification, but for things that recur (a daily reminder for
 * the same unresolved payment) — upserts on (userId, groupKey) instead of
 * always inserting, so repeats refresh one notification row rather than
 * piling up a new one each time. Resets isRead to false on refresh so a
 * dismissed-then-re-triggered reminder resurfaces.
 */
export async function emitGroupedNotification(payload: GroupedNotificationPayload): Promise<void> {
  const { userId, type, title, message, linkUrl, metadata, groupKey } = payload
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const now = new Date()

  try {
    const existing = await prisma.appNotification.findFirst({
      where: { userId, groupKey },
      select: { id: true, occurrenceCount: true },
    })

    let notif
    if (existing) {
      notif = await prisma.appNotification.update({
        where: { id: existing.id },
        data: {
          title, message, linkUrl: linkUrl ?? null, metadata: metadata ?? Prisma.DbNull,
          isRead: false, readAt: null,
          occurrenceCount: existing.occurrenceCount + 1,
          lastOccurredAt: now,
          createdAt: now, // bump to the top of the chronological list
          expiresAt,
        },
        select: { id: true, userId: true, type: true, title: true, message: true, linkUrl: true, createdAt: true },
      })
    } else {
      notif = await prisma.appNotification.create({
        data: { userId, type, title, message, linkUrl: linkUrl ?? null, metadata: metadata ?? Prisma.DbNull, expiresAt, groupKey, occurrenceCount: 1, lastOccurredAt: now },
        select: { id: true, userId: true, type: true, title: true, message: true, linkUrl: true, createdAt: true },
      })
    }

    emitToUser(notif.userId, 'notification:new', {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      linkUrl: notif.linkUrl,
      createdAt: notif.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('[notification-emitter] Failed to emit grouped notification:', err)
  }
}

/** Deletes every grouped notification for a resolved groupKey (all recipients). */
export async function clearGroupedNotifications(groupKey: string): Promise<void> {
  try {
    await prisma.appNotification.deleteMany({ where: { groupKey } })
  } catch (err) {
    console.error('[notification-emitter] Failed to clear grouped notifications:', err)
  }
}
