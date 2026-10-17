/**
 * MBM-319 — hourly sweep that keeps re-raising the flagged "restaurant
 * expenses awaiting payment request" notice until resolved (see
 * restaurant-expense-notify.ts). Same node-cron pattern as the receipt
 * reminder scheduler; wired into server.ts at startup.
 */
import { schedule } from 'node-cron'
import { sweepRestaurantExpenseNotices } from './restaurant-expense-notify'

let started = false

export function startRestaurantExpenseReminderScheduler(): void {
  if (started) return
  started = true

  schedule('15 * * * *', async () => {
    try {
      const n = await sweepRestaurantExpenseNotices()
      if (n > 0) console.log(`[Restaurant Expense Reminder] Checked ${n} restaurant(s)`)
    } catch (error) {
      console.error('[Restaurant Expense Reminder] Scheduled run failed:', error)
    }
  })

  console.log('[Restaurant Expense Reminder] Started — sweeping hourly')
}
