/**
 * MBM-288 §6 — nightly recalculation of every enabled business's minimum
 * and recommended target. Same node-cron pattern as the R710 auto-generate
 * scheduler (src/lib/r710/auto-generate-scheduler.ts) — wired into
 * server.ts at startup the same way.
 */

import { schedule } from 'node-cron'
import { recalculateAllBusinessTargets } from './recalculate-all-targets'

let started = false

export function startBusinessTargetRecalculationScheduler(): void {
  if (started) return
  started = true

  // 02:00 every day — after EOD closes are done for the day, ahead of the
  // next trading day.
  schedule('0 2 * * *', async () => {
    try {
      const result = await recalculateAllBusinessTargets()
      console.log(`[Business Target Scheduler] Recalculated ${result.businessesProcessed} business(es), ${result.errors.length} error(s)`)
      for (const e of result.errors) {
        console.error(`[Business Target Scheduler] Failed for business ${e.businessId}: ${e.error}`)
      }
    } catch (error) {
      console.error('[Business Target Scheduler] Scheduled run failed:', error)
    }
  })

  console.log('[Business Target Scheduler] Started — recalculating nightly at 02:00')
}
