// MBM-339 / MBM-340 — Farm Control camera alerts (movement / sound)
// (guide §7.12, revision 5; alert list guide §3; plans MBM-339 §2.2, MBM-340 §2.2).
//
// Each user chooses their own alerting cameras (My Cameras, or the 🔔 in Farm
// Control's viewer; the same list). This runs in the server process, so
// alerts are kept also while MBM is closed:
// - Every minute: for each Linked person with cameras MBM allows them and
//   "Keep my camera alerts" on, `GET /cameras?alerting=true` → who has
//   alerting cameras, kept in memory (MBM's own filter on top). Hourly, alerts
//   older than 30 days are cleaned (except watch later).
// - Every 5 s (the guide's minimum), only for those people:
//   `GET /camera-events?since=<Farm Control's last now>`, then alert-store:
//   - a camera newly in `goingOn` → an alert at once (or joins the latest);
//   - a camera that left `goingOn` → its open alert is closed;
//   - an `events` item with a new id → completes / joins / starts an alert.
//   Paused cameras (🔕, MBM side) are dropped. The first answer after a start
//   only sets the cursor (its events count as known).
// - 429 `limit` → that person waits `retryAfter`; one person's failure never
//   holds up the others; runs never overlap.
// Cursors and dedupe are in memory on purpose (transient, guide §7.12); the
// alerts themselves are in farm_camera_alerts.
import { prisma } from '@/lib/prisma'
import { getCameraPreferences, getFarmControlIntegration, getUserCameraAccess, isIntegrationReady, loadCameraUser } from './server'
import { farmErrorText, farmServerCall, farmServerFetch, FarmServerError } from './server-api'
import { alertEvent, alertGoingOn, alertStopped, cleanOldAlerts, pausedCameras, triggerOf } from './alert-store'

const FAST_MS = 5_000
const LIST_MS = 60_000
const SEEN_KEEP_MS = 2 * 60 * 60_000
const CLEAN_MS = 60 * 60_000

interface CameraFinding { cameraId: number | string; name: string; site?: { id: number | string; name: string } | null; trigger: string }
interface CameraEvent extends CameraFinding { id: number | string; start: string; end?: string | null; pictureUrl?: string | null }

interface Watcher {
  userId: string
  name: string | null
  cameraIds: Set<string> // alerting AND allowed by MBM
  cursor: string | null // Farm Control's `now`
  goingOn: Set<string> // cameras in the last goingOn
  seen: Map<string, number> // event id → when seen
  waitUntil: number
  error: string | null
  checkedAt: number
}

/** Shared with the admin route (same process, possibly another module copy) */
interface MotionStatus { lastRunAt: number | null; watching: number; lastError: string | null }
const g = globalThis as unknown as { __farmMotion?: { watchers: Map<string, Watcher>; status: MotionStatus } }
const state = (g.__farmMotion ||= { watchers: new Map(), status: { lastRunAt: null, watching: 0, lastError: null } })

export function getFarmMotionStatus(): MotionStatus & { people: { userId: string; checkedAt: number; error: string | null; cameras: number }[] } {
  return {
    ...state.status,
    people: [...state.watchers.values()].map(w => ({ userId: w.userId, checkedAt: w.checkedAt, error: w.error, cameras: w.cameraIds.size })),
  }
}

// ── Every minute: who has alerting cameras ─────────────────────────────────

let listing = false
let lastClean = 0
async function refreshWatchers(): Promise<void> {
  if (listing) return
  listing = true
  try {
    const integration = await getFarmControlIntegration()
    if (!isIntegrationReady(integration)) { state.watchers.clear(); state.status.watching = 0; return }
    const links = await prisma.farmControlUserLinks.findMany({
      where: { status: 'LINKED', users: { isActive: true } },
      select: { userId: true, users: { select: { name: true } } },
    })
    const keep = new Set<string>()
    let lastError: string | null = null
    for (const link of links) {
      try {
        const prefs = await getCameraPreferences(link.userId)
        if (!prefs.motionAlertsBell) continue // "Keep my camera alerts" off
        const user = await loadCameraUser(link.userId)
        if (!user) continue
        const allowed = new Set((await getUserCameraAccess(user)).cameraIds)
        if (allowed.size === 0) continue
        const d = await farmServerCall<{ cameras?: { id: number | string }[] }>(integration, { id: link.userId, name: link.users.name }, 'GET', '/cameras?alerting=true&limit=200')
        const ids = new Set((d.cameras || []).map(c => String(c.id)).filter(id => allowed.has(id)))
        if (ids.size === 0) continue
        keep.add(link.userId)
        const w = state.watchers.get(link.userId)
        if (w) { w.cameraIds = ids; w.name = link.users.name }
        else state.watchers.set(link.userId, { userId: link.userId, name: link.users.name, cameraIds: ids, cursor: null, goingOn: new Set(), seen: new Map(), waitUntil: 0, error: null, checkedAt: 0 })
      } catch (e) {
        lastError = farmErrorText(e)
        // Keep an existing watcher: a passing error shouldn't stop their alerts
        if (state.watchers.has(link.userId)) keep.add(link.userId)
      }
    }
    for (const id of [...state.watchers.keys()]) if (!keep.has(id)) state.watchers.delete(id)
    state.status.watching = state.watchers.size
    if (lastError) state.status.lastError = lastError

    if (Date.now() - lastClean > CLEAN_MS) {
      lastClean = Date.now()
      await cleanOldAlerts()
    }
  } catch (err) {
    console.error('[farm-motion] listing failed:', err)
  } finally {
    listing = false
  }
}

// ── Every 5 s: what the alerting cameras find ──────────────────────────────

type Integration = NonNullable<Awaited<ReturnType<typeof getFarmControlIntegration>>>

let polling = false
async function pollOnce(): Promise<void> {
  if (polling || state.watchers.size === 0) return
  polling = true
  try {
    const integration = await getFarmControlIntegration()
    if (!isIntegrationReady(integration)) return
    let failures = 0
    let lastError: string | null = null
    for (const w of state.watchers.values()) {
      if (Date.now() < w.waitUntil) continue
      try {
        const path = w.cursor ? `/camera-events?since=${encodeURIComponent(w.cursor)}` : '/camera-events'
        const d = await farmServerCall<{ now?: string; goingOn?: CameraFinding[]; events?: CameraEvent[] }>(integration, { id: w.userId, name: w.name }, 'GET', path)
        const first = !w.cursor
        w.cursor = d.now || new Date().toISOString()
        w.checkedAt = Date.now()
        w.error = null
        await handle(integration, w, d.goingOn || [], d.events || [], first, new Date(w.cursor))
      } catch (e) {
        failures++
        w.checkedAt = Date.now()
        if (e instanceof FarmServerError && e.status === 429) { w.waitUntil = Date.now() + (e.retryAfter ?? 5) * 1000; continue }
        w.error = lastError = farmErrorText(e)
        w.waitUntil = Date.now() + 30_000 // a failing person is tried again in 30 s
      }
    }
    state.status.lastRunAt = Date.now()
    state.status.lastError = failures > 0 && failures === state.watchers.size ? lastError : null
  } catch (err) {
    console.error('[farm-motion] run failed:', err)
  } finally {
    polling = false
  }
}

/** A picture fetched by the server as this person (never through the browser) */
function pictureFrom(integration: Integration, w: Watcher, path: string) {
  return async () => {
    const r = await farmServerFetch(integration, { id: w.userId, name: w.name }, path)
    return new Uint8Array(await r.arrayBuffer())
  }
}

async function handle(integration: Integration, w: Watcher, goingOn: CameraFinding[], events: CameraEvent[], first: boolean, farmNow: Date) {
  const now = Date.now()
  for (const [id, t] of w.seen) if (now - t > SEEN_KEEP_MS) w.seen.delete(id)

  // Only cameras MBM allows (Farm Control already limits to the user's own)
  const mine = (c: { cameraId: number | string }) => w.cameraIds.has(String(c.cameraId))
  const current = new Set(goingOn.filter(mine).map(f => String(f.cameraId)))
  if (first) {
    // Treat the first answer as known (guide §7.12 step 1)
    for (const e of events) w.seen.set(String(e.id), now)
    w.goingOn = current
    return
  }

  const fresh = events.filter(e => mine(e) && !w.seen.has(String(e.id)))
  const started = goingOn.filter(f => mine(f) && !w.goingOn.has(String(f.cameraId)))
  const stopped = [...w.goingOn].filter(id => !current.has(id))
  w.goingOn = current
  if (fresh.length === 0 && started.length === 0 && stopped.length === 0) return

  const at = Number.isNaN(farmNow.getTime()) ? new Date() : farmNow
  const paused = await pausedCameras(w.userId)

  for (const f of started) {
    const cameraId = String(f.cameraId)
    if (paused.has(cameraId)) continue
    await alertGoingOn(w.userId, {
      cameraId, name: f.name, siteId: f.site ? String(f.site.id) : null, siteName: f.site?.name ?? null, trigger: triggerOf(f.trigger),
    }, at, pictureFrom(integration, w, `/cameras/${encodeURIComponent(cameraId)}/picture`))
  }

  // Oldest first, so joins happen in time order
  for (const e of fresh.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))) {
    const id = String(e.id)
    w.seen.set(id, now) // the time passed is included: repeats come
    const cameraId = String(e.cameraId)
    if (paused.has(cameraId)) continue // nothing found while paused comes later
    const start = new Date(e.start)
    if (Number.isNaN(start.getTime())) continue
    const end = e.end ? new Date(e.end) : null
    await alertEvent(w.userId, {
      eventId: id, cameraId, name: e.name, siteId: e.site ? String(e.site.id) : null, siteName: e.site?.name ?? null,
      trigger: triggerOf(e.trigger), start, end: end && !Number.isNaN(end.getTime()) ? end : null, hasPicture: !!e.pictureUrl,
    }, pictureFrom(integration, w, `/camera-events/${encodeURIComponent(id)}/picture`))
  }

  for (const cameraId of stopped) {
    if (!paused.has(cameraId)) await alertStopped(w.userId, cameraId, at)
  }
}

let started = false

/** Started from server.ts: the alerting list every minute, camera events every 5 s. */
export function startFarmMotionScheduler(): void {
  if (started) return
  started = true
  setTimeout(() => { refreshWatchers() }, 20_000)
  setInterval(() => { refreshWatchers() }, LIST_MS)
  setInterval(() => { pollOnce() }, FAST_MS)
  console.log('[Farm Motion] Started — camera alerts (movement / sound) every 5 s for people with alerting cameras')
}

/** After a person changes their alerting cameras: pick it up now, not within the minute */
export function refreshFarmMotionSoon(): void {
  setTimeout(() => { refreshWatchers() }, 500)
}
