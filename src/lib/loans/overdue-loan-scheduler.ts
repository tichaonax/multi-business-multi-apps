/**
 * Nightly sweep for overdue loan repayments. Same node-cron pattern as the
 * receipt reminder scheduler (receipt-reminder-scheduler.ts) — wired into
 * server.ts at startup the same way.
 */

import { schedule } from 'node-cron'
import { sweepOverdueLoans } from './overdue-loan-sweep'

let started = false

export function startOverdueLoanScheduler(): void {
  if (started) return
  started = true

  // 07:15 — just after the receipt reminder sweep, same start-of-day slot.
  schedule('15 7 * * *', async () => {
    try {
      const result = await sweepOverdueLoans()
      console.log(`[Overdue Loan Scheduler] Scanned ${result.scanned} active loan(s), flagged ${result.flagged} overdue`)
    } catch (error) {
      console.error('[Overdue Loan Scheduler] Scheduled run failed:', error)
    }
  })

  console.log('[Overdue Loan Scheduler] Started — sweeping nightly at 07:15')
}
