/**
 * Nightly sweep for the Combo Payment Request 30-day auto-expiry deadline.
 * Same node-cron pattern as the business target recalculation scheduler
 * (src/lib/business-targets/recalculate-all-targets-scheduler.ts) — wired
 * into server.ts at startup the same way.
 *
 * The approve/ and items/[itemId]/ routes also lazily expire a request the
 * moment someone tries to act on it past the deadline (defense-in-depth, so
 * nothing slips through between runs of this job) — this sweep's job is to
 * catch requests nobody is actively trying to act on, and to send the
 * advance warnings while there's still time to act.
 */

import { schedule } from 'node-cron'
import { prisma } from '@/lib/prisma'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import { isComboRequestExpired, daysRemaining, expireComboRequestTx } from './combo-request-expiry'

let started = false

// Days-remaining thresholds that trigger a one-time warning to cashiers.
const WARNING_THRESHOLDS = [7, 2]

export function startComboRequestExpiryScheduler(): void {
  if (started) return
  started = true

  // 02:30 — just after the 02:00 business target recalculation.
  schedule('30 2 * * *', async () => {
    try {
      const result = await sweepComboRequestExpiry()
      console.log(`[Combo Expiry Scheduler] Expired ${result.expired}, warned ${result.warned} request(s)`)
    } catch (error) {
      console.error('[Combo Expiry Scheduler] Scheduled run failed:', error)
    }
  })

  console.log('[Combo Expiry Scheduler] Started — sweeping nightly at 02:30')
}

export async function sweepComboRequestExpiry(): Promise<{ expired: number; warned: number }> {
  const requests = await prisma.comboPaymentRequests.findMany({
    where: {
      status: { in: ['SUBMITTED', 'APPROVED', 'PARTIALLY_APPROVED'] },
      submittedAt: { not: null },
    },
    select: { id: true, accountId: true, title: true, status: true, submittedAt: true, linkedPaymentId: true, createdBy: true },
  })

  let expired = 0
  let warned = 0

  for (const req of requests) {
    if (isComboRequestExpired(req)) {
      await prisma.$transaction(tx => expireComboRequestTx(tx, req))
      expired++
      try {
        await emitNotification({
          userIds: [req.createdBy],
          type: 'COMBO_REQUEST_EXPIRED',
          title: 'Combo Request Expired',
          message: `"${req.title}" expired — it wasn't paid within 30 days of submission. Resubmit it to try again.`,
          linkUrl: `/expense-accounts/${req.accountId}/combo-requests/${req.id}`,
        })
      } catch (notifErr) {
        console.error('[Combo Expiry Scheduler] Notification error (non-blocking):', notifErr)
      }
      continue
    }

    const remaining = daysRemaining(req)
    if (remaining === null) continue

    const threshold = WARNING_THRESHOLDS.find(t => remaining <= t)
    if (!threshold) continue

    // Dedupe on requestId + threshold so each threshold warns once per
    // request, not every night until someone acts on it.
    const existing = await prisma.appNotification.findFirst({
      where: {
        type: 'COMBO_REQUEST_EXPIRING',
        AND: [
          { metadata: { path: ['requestId'], equals: req.id } },
          { metadata: { path: ['threshold'], equals: threshold } },
        ],
      },
      select: { id: true },
    })
    if (existing) continue

    const grants = await prisma.expenseAccountGrants.findMany({
      where: { expenseAccountId: req.accountId, permissionLevel: 'FULL' },
      select: { userId: true },
    })
    const cashierIds = grants.map(g => g.userId)
    if (cashierIds.length === 0) continue

    try {
      await emitNotification({
        userIds: cashierIds,
        type: 'COMBO_REQUEST_EXPIRING',
        title: `Combo Request Expiring in ${remaining} Day${remaining === 1 ? '' : 's'}`,
        message: `"${req.title}" will expire in ${remaining} day${remaining === 1 ? '' : 's'} if not paid — act soon or it will need to be resubmitted.`,
        linkUrl: `/expense-accounts/${req.accountId}/combo-requests/${req.id}`,
        metadata: { requestId: req.id, threshold },
      })
      warned++
    } catch (notifErr) {
      console.error('[Combo Expiry Scheduler] Notification error (non-blocking):', notifErr)
    }
  }

  return { expired, warned }
}
