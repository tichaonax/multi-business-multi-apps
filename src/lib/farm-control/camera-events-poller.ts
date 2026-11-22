// MBM-339 — Farm Control camera alerts (movement / sound) in MBM's bell
// (guide §7.12, revision 5; plan MBM-339 §2.2).
//
// Each user chooses their own alerting cameras (My Cameras, or the 🔔 in Farm
// Control's viewer; the same list). This runs in the server process, so the
// user is told also while MBM is closed:
// - Every minute: for each Linked person with cameras MBM allows them and
//   "Movement & sound alerts in notifications" on, `GET /cameras?alerting=true`
//   → who has alerting cameras, kept in memory (MBM's own filter on top).
// - Every 5 s (the guide's minimum), only for those people:
//   `GET /camera-events?since=<Farm Control's last now>`.
//   - A camera newly in `goingOn` → notify; not again while it stays there.
//   - An `events` item with a new id → if that camera was notified from
//     `goingOn` a little before its start, the same thing: update the row
//     with its picture; otherwise notify.
//   The first answer after a start only sets the cursor (its events count as
//   known), so nothing is repeated after a restart.
// - The bell: one row per camera (groupKey farm-motion:<userId>:<cameraId>),
//   refreshed with each detection (B2); rows older than 24 h are removed.
// - 429 `limit` → that person waits `retryAfter`; one person's failure never
//   holds up the others; runs never overlap.
// Cursors and dedupe are in memory on purpose (transient, guide §7.12).
import { prisma } from '@/lib/prisma'
import { emitGroupedNotification } from '@/lib/notifications/notification-emitter'
import { getCameraPreferences, getFarmControlIntegration, getUserCameraAccess, isIntegrationReady, loadCameraUser } from './server'
import { farmErrorText, farmServerCall, FarmServerError } from './server-api'

export const FARM_MOTION_NOTIFICATION_TYPE = 'FARM_CAMERA_MOTION' as const
const FAST_MS = 5_000
const LIST_MS = 60_000
const SAME_THING_MS = 2 * 60_000 // an event starting this soon after a goingOn notice is the same thing
const SEEN_KEEP_MS = 2 * 60 * 60_000
const ROW_KEEP_MS = 24 * 60 * 60_000

type Trigger = 'motion' | 'sound' | 'both'
interface CameraFinding { cameraId: number | string; name: string; site?: { id: number | string; name: string } | null; trigger: Trigger }
interface CameraEvent extends CameraFinding { id: number | string; start: string; end?: string | null; pictureUrl?: string | null }

interface Watcher {
  userId: string
  name: string | null
  cameraIds: Set<string> // alerting AND allowed by MBM
  cursor: string | null // Farm Control's `now`
  goingOn: Set<string> // cameras in the last goingOn
  notifiedAt: Map<string, number> // cameraId → when we last notified from goingOn
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

const TRIGGER_TEXT: Record<Trigger, { icon: string; text: string }> = {
  motion: { icon: '🟠', text: 'Movement' },
  sound: { icon: '🔵', text: 'Sound' },
  both: { icon: '🟣', text: 'Movement and sound' },
}
const triggerOf = (t: unknown): Trigger => (t === 'sound' || t === 'both' ? t : 'motion')

/** Opens the recording 5 s before it started (guide §7.12), or the camera live */
function linkFor(cameraId: string, start?: string | null) {
  const at = start ? new Date(Date.parse(start) - 5_000) : null
  return `/cameras?open=${encodeURIComponent(cameraId)}${at && !Number.isNaN(at.getTime()) ? `&at=${encodeURIComponent(at.toISOString())}` : ''}`
}

// ── Every minute: who has alerting cameras ─────────────────────────────────

let listing = false
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
        if (!prefs.motionAlertsBell) continue
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
        else state.watchers.set(link.userId, { userId: link.userId, name: link.users.name, cameraIds: ids, cursor: null, goingOn: new Set(), notifiedAt: new Map(), seen: new Map(), waitUntil: 0, error: null, checkedAt: 0 })
      } catch (e) {
        lastError = farmErrorText(e)
        // Keep an existing watcher: a passing error shouldn't stop their alerts
        if (state.watchers.has(link.userId)) keep.add(link.userId)
      }
    }
    for (const id of [...state.watchers.keys()]) if (!keep.has(id)) state.watchers.delete(id)
    state.status.watching = state.watchers.size
    if (lastError) state.status.lastError = lastError

    // Bell rows for movement are short-lived: older than a day, gone
    await prisma.appNotification.deleteMany({
      where: { type: FARM_MOTION_NOTIFICATION_TYPE, lastOccurredAt: { lt: new Date(Date.now() - ROW_KEEP_MS) } },
    })
  } catch (err) {
    console.error('[farm-motion] listing failed:', err)
  } finally {
    listing = false
  }
}

// ── Every 5 s: what the alerting cameras find ──────────────────────────────

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
        await handle(w, d.goingOn || [], d.events || [], first)
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

async function handle(w: Watcher, goingOn: CameraFinding[], events: CameraEvent[], first: boolean) {
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

  for (const f of goingOn.filter(mine)) {
    const cameraId = String(f.cameraId)
    if (w.goingOn.has(cameraId)) continue // still going on: not again
    w.notifiedAt.set(cameraId, now)
    await notify(w.userId, f, null)
  }
  w.goingOn = current

  for (const e of events.filter(mine)) {
    const id = String(e.id)
    if (w.seen.has(id)) continue // the time passed is included: repeats come
    w.seen.set(id, now)
    const cameraId = String(e.cameraId)
    const told = w.notifiedAt.get(cameraId)
    const start = Date.parse(e.start)
    const same = told !== undefined && !Number.isNaN(start) && told >= start - 10_000 && told - start < SAME_THING_MS
    await notify(w.userId, e, e, same)
  }
}

async function notify(userId: string, f: CameraFinding, event: CameraEvent | null, update = false) {
  const cameraId = String(f.cameraId)
  const t = TRIGGER_TEXT[triggerOf(f.trigger)]
  const site = f.site?.name ? ` (${f.site.name})` : ''
  const groupKey = `farm-motion:${userId}:${cameraId}`
  const when = event?.start ? new Date(event.start) : new Date()
  const metadata = {
    cameraId,
    trigger: triggerOf(f.trigger),
    eventId: event ? String(event.id) : null,
    hasPicture: event ? !!event.pictureUrl : true, // going on: the camera's picture now
    at: when.toISOString(),
  }
  if (update) {
    // Same thing as the goingOn notice: give that row its time and picture, no new alert
    const row = await prisma.appNotification.findFirst({ where: { userId, groupKey }, select: { id: true } })
    if (row) {
      await prisma.appNotification.update({ where: { id: row.id }, data: { linkUrl: linkFor(cameraId, event?.start), metadata } })
      return
    }
  }
  const existing = await prisma.appNotification.findFirst({ where: { userId, groupKey }, select: { occurrenceCount: true } })
  const times = (existing?.occurrenceCount ?? 0) + 1
  await emitGroupedNotification({
    userId,
    type: FARM_MOTION_NOTIFICATION_TYPE,
    title: `${t.icon} ${t.text} at ${f.name || `camera ${cameraId}`}${site}`,
    message: `${event ? `At ${when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Now'}${times > 1 ? ` · ${times} times` : ''}. Tap to watch.`,
    linkUrl: linkFor(cameraId, event?.start),
    metadata,
    groupKey,
  })
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
