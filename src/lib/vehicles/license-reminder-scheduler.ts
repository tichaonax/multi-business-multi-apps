/**
 * Nightly sweep for overdue/expiring vehicle and driver licenses. Same
 * node-cron pattern as the receipt reminder scheduler
 * (receipt-reminder-scheduler.ts) — wired into server.ts at startup the
 * same way.
 *
 * GET /api/notifications also triggers the same sweep lazily (throttled) so
 * a newly-overdue license doesn't have to wait for the next nightly run —
 * see license-reminder-notify.ts.
 */

import { schedule } from 'node-cron'
import { sweepVehicleLicenseReminders } from './license-reminder-notify'

let started = false

export function startVehicleLicenseReminderScheduler(): void {
  if (started) return
  started = true

  // 07:15 — right after the 07:00 receipt-reminder sweep.
  schedule('15 7 * * *', async () => {
    try {
      const result = await sweepVehicleLicenseReminders()
      console.log(`[Vehicle License Reminder Scheduler] ${result.vehicleLicenses} vehicle license(s), ${result.driverLicenses} driver license(s) flagged — ${result.notificationsSent} notification(s) sent/refreshed`)
    } catch (error) {
      console.error('[Vehicle License Reminder Scheduler] Scheduled run failed:', error)
    }
  })

  console.log('[Vehicle License Reminder Scheduler] Started — sweeping nightly at 07:15')
}
