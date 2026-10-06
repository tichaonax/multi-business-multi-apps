/**
 * Nightly sweep for outstanding (unreconciled) receipt reviews. Same
 * node-cron pattern as the combo-request expiry scheduler
 * (combo-request-expiry-scheduler.ts) — wired into server.ts at startup the
 * same way.
 *
 * GET /api/notifications also triggers the same sweep lazily (throttled) so
 * a brand-new discrepancy doesn't have to wait for the next nightly run —
 * see receipt-review-notify.ts.
 */

import { schedule } from 'node-cron'
import { sweepOutstandingReceiptReminders } from './receipt-review-notify'

let started = false

export function startReceiptReminderScheduler(): void {
  if (started) return
  started = true

  // 07:00 — a normal start-of-day time to land reminders.
  schedule('0 7 * * *', async () => {
    try {
      const result = await sweepOutstandingReceiptReminders()
      console.log(`[Receipt Reminder Scheduler] ${result.payments} outstanding payment(s): ${result.requesterReminders} requester reminder(s), ${result.cashierReminders} cashier reminder(s)`)
    } catch (error) {
      console.error('[Receipt Reminder Scheduler] Scheduled run failed:', error)
    }
  })

  console.log('[Receipt Reminder Scheduler] Started — sweeping nightly at 07:00')
}
