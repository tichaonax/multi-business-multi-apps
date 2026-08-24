/**
 * Wires runAutoGenerationCheck() (auto-generate-service.ts) into a real
 * periodic job. That function has existed since MBM-272 with a doc comment
 * saying it "should be called periodically (e.g., every 10 minutes) by a
 * background job" — but had zero callers anywhere in the codebase, so no
 * business's WiFi token pool was ever actually auto-topped-up despite the
 * `autoGenerateThreshold`/`autoGenerateQuantity` config existing on every
 * R710TokenConfigs row. node-cron is already a package.json dependency but
 * was, likewise, never actually imported anywhere real (only inside a
 * commented-out example in src/lib/layby/scheduler.ts).
 */

import { schedule } from 'node-cron'
import { runAutoGenerationCheck } from './auto-generate-service'

let started = false

export function startAutoGenerateScheduler(): void {
  if (started) return
  started = true

  schedule('*/10 * * * *', async () => {
    try {
      const result = await runAutoGenerationCheck()
      if (result.tokensGenerated > 0 || result.errors.length > 0) {
        console.log(`[R710 Auto-Gen Scheduler] ${result.tokensGenerated} token(s) generated across ${result.businessesProcessed} business(es), ${result.errors.length} error(s)`)
      }
    } catch (error) {
      console.error('[R710 Auto-Gen Scheduler] Scheduled check failed:', error)
    }
  })

  console.log('[R710 Auto-Gen Scheduler] Started — checking every 10 minutes')
}
