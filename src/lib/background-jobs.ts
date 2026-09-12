/**
 * Four periodic maintenance jobs relocated out of the legacy peer-to-peer
 * sync engine (src/lib/sync/, removed — see
 * ai-contexts/project-plans/review/projectplan-NOTKT-remove-legacy-sync-service-2026-09-12.md
 * §3.7). They only ever piggybacked on that engine's process because it was
 * "the thing that's always running" — none of them have anything to do with
 * database sync. Moved here, wired into server.ts at startup the same way
 * as the other schedulers already there (auto-generate-scheduler.ts,
 * recalculate-all-targets-scheduler.ts).
 *
 * Previously configured only via a `data/sync/config.json` file (that
 * directory no longer exists) — every job is now enabled/tuned via plain
 * env vars instead, since that's what the pre-existing (but never actually
 * wired) documentation for two of these jobs already told operators to set
 * (docs/windows-sync-service-configuration.md's "Option 1: Environment
 * Variables"). All four were confirmed disabled everywhere before this
 * move (no `data/sync/config.json` on any known server ever populated
 * these keys) — so this ships as a like-for-like relocation, opt-in only.
 */

const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || '8080'}`

function boolEnv(name: string): boolean {
  return process.env[name] === 'true'
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  const parsed = raw ? parseInt(raw, 10) : NaN
  return isNaN(parsed) ? fallback : parsed
}

let started = false

export function startBackgroundJobs(): void {
  if (started) return
  started = true

  startPrintWorkerHealthMonitoring()
  startWifiTokenSanitization()
  startR710ConnectedClientsSync()
  startEsp32ConnectedClientsSync()
}

function startPrintWorkerHealthMonitoring(): void {
  if (!boolEnv('PRINT_WORKER_HEALTH_CHECK_ENABLED')) return

  const url = process.env.PRINT_WORKER_HEALTH_CHECK_URL || `${APP_BASE_URL}/api/health/print-worker`
  const interval = intEnv('PRINT_WORKER_HEALTH_CHECK_INTERVAL_MS', 60000) // 1 minute default
  const autoRestart = process.env.PRINT_WORKER_HEALTH_CHECK_AUTO_RESTART !== 'false' // default true

  console.log(`[Background Jobs] Starting print worker health monitoring (${url}, interval: ${interval}ms)`)

  setInterval(async () => {
    try {
      const checkUrl = autoRestart ? `${url}?autoRestart=true` : url
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(checkUrl, { method: 'GET', signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`[Print Worker Health] Check failed: HTTP ${response.status}`)
        return
      }

      const data = await response.json()
      if (data.worker?.wasRestarted) {
        console.warn('[Print Worker Health] ⚠️  Print worker was not running and has been restarted')
      } else if (!data.worker?.isRunning) {
        console.error('[Print Worker Health] ❌ Print worker is not running')
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.warn('[Print Worker Health] Check timed out')
      } else {
        console.error('[Print Worker Health] Check error:', error)
      }
    }
  }, interval)
}

function startWifiTokenSanitization(): void {
  if (!boolEnv('WIFI_TOKEN_SANITIZATION_ENABLED')) return

  const url = process.env.WIFI_TOKEN_SANITIZATION_URL || `${APP_BASE_URL}/api/wifi-portal/admin/sanitize-tokens`
  const interval = intEnv('WIFI_TOKEN_SANITIZATION_INTERVAL_MS', 21600000) // 6 hours default

  console.log(`[Background Jobs] Starting WiFi token sanitization (${url}, interval: ${interval / 3600000}h)`)

  const runSanitization = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`[WiFi Token Sanitization] Failed: HTTP ${response.status}`)
        return
      }

      const data = await response.json()
      if (data.success && data.result) {
        const { processed, disabled, businessesProcessed, errors } = data.result
        console.log(`[WiFi Token Sanitization] ✅ ${disabled}/${processed} tokens disabled across ${businessesProcessed} businesses`)
        if (errors?.length > 0) {
          console.warn(`[WiFi Token Sanitization] ⚠️  ${errors.length} error(s):`, errors)
        }
      } else {
        console.error('[WiFi Token Sanitization] Failed:', data.error || 'Unknown error')
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.error('[WiFi Token Sanitization] Timed out (exceeded 5 minutes)')
      } else {
        console.error('[WiFi Token Sanitization] Error:', error)
      }
    }
  }

  // Run once shortly after startup, then on the configured interval.
  setTimeout(runSanitization, 10000)
  setInterval(runSanitization, interval)
}

function startR710ConnectedClientsSync(): void {
  if (!boolEnv('R710_SYNC_ENABLED')) return

  const url = process.env.R710_SYNC_URL || `${APP_BASE_URL}/api/r710/connected-clients/sync`
  const interval = intEnv('R710_SYNC_INTERVAL', 300000) // 5 minutes default

  console.log(`[Background Jobs] Starting R710 connected clients sync (${url}, interval: ${interval / 60000}min)`)

  const run = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)
      const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`[R710 Sync] ❌ Failed: ${response.status} ${await response.text()}`)
        return
      }

      const result = await response.json()
      if (result.success) {
        console.log(`[R710 Sync] ✅ ${result.synced} clients synced from ${result.devices} devices`)
      } else {
        console.error(`[R710 Sync] ❌ Failed: ${result.error}`)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[R710 Sync] ❌ Timed out after 2 minutes')
      } else {
        console.error('[R710 Sync] ❌ Error:', error)
      }
    }
  }

  run()
  setInterval(run, interval)
}

function startEsp32ConnectedClientsSync(): void {
  if (!boolEnv('ESP32_SYNC_ENABLED')) return

  const url = process.env.ESP32_SYNC_URL || `${APP_BASE_URL}/api/esp32/connected-clients/sync`
  const interval = intEnv('ESP32_SYNC_INTERVAL', 300000) // 5 minutes default

  console.log(`[Background Jobs] Starting ESP32 connected clients sync (${url}, interval: ${interval / 60000}min)`)

  const run = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)
      const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`[ESP32 Sync] ❌ Failed: ${response.status} ${await response.text()}`)
        return
      }

      const result = await response.json()
      if (result.success) {
        console.log(`[ESP32 Sync] ✅ ${result.synced} clients synced from ${result.devices} devices`)
      } else {
        console.error(`[ESP32 Sync] ❌ Failed: ${result.error}`)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[ESP32 Sync] ❌ Timed out after 2 minutes')
      } else {
        console.error('[ESP32 Sync] ❌ Error:', error)
      }
    }
  }

  run()
  setInterval(run, interval)
}
