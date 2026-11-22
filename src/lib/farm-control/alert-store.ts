// MBM-340 — each person's camera alerts, kept by MBM (alert list guide §3.2–§3.5).
// Farm Control's /camera-events reaches only an hour back, so MBM keeps the
// list: alerts made from goingOn at once, completed when their event comes,
// back-to-back findings joined ("×n"), the first picture kept. One bell row
// per person carries only the count of new alerts (decision C1); the person's
// open pages are told over the socket (`farm-alert`).
// Runs in the server process (the checker) and in API routes: no next/server.
import { prisma } from '@/lib/prisma'
import { emitToUser } from '@/lib/customer-display/socket-server'
import { emitGroupedNotification } from '@/lib/notifications/notification-emitter'

export type Trigger = 'motion' | 'sound' | 'both'
export interface Finding { eventId: string; start: string; end: string | null; trigger: Trigger }

const JOIN_GAP_MS = 2 * 60_000 // a finding this soon after the alert ended joins it
const JOIN_SPAN_MS = 30 * 60_000 // ... while the alert started less than this ago
const COMPLETE_WINDOW_MS = 2 * 60_000 // an event this close to a goingOn alert's start completes it
const KEEP_MS = 30 * 24 * 60 * 60_000
const MAX_PICTURE_BYTES = 512 * 1024
export const FARM_ALERTS_BELL_TYPE = 'FARM_CAMERA_MOTION' as const
const bellKey = (userId: string) => `farm-alerts:${userId}`

const TRIGGER_TEXT: Record<Trigger, string> = { motion: 'Movement', sound: 'Sound', both: 'Movement and sound' }
export const triggerOf = (t: unknown): Trigger => (t === 'sound' || t === 'both' ? t : 'motion')
const widen = (a: Trigger, b: Trigger): Trigger => (a === b ? a : 'both')

/** What the browser gets for a row (no picture bytes) */
export const ALERT_SELECT = {
  id: true, cameraId: true, cameraName: true, siteId: true, siteName: true, trigger: true,
  start: true, end: true, times: true, lastAt: true, findings: true, pictureFromEvent: true,
  seenAt: true, dismissedAt: true, laterAt: true, updatedAt: true,
} as const

export async function alertRow(id: string) {
  const a = await prisma.farmCameraAlerts.findUnique({ where: { id }, select: { ...ALERT_SELECT, picture: false } })
  if (!a) return null
  const hasPicture = await prisma.farmCameraAlerts.count({ where: { id, picture: { not: null } } })
  return { ...a, hasPicture: hasPicture > 0 }
}

export async function newAlertCount(userId: string) {
  return prisma.farmCameraAlerts.count({ where: { userId, seenAt: null, dismissedAt: null } })
}

function when(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/**
 * The person's single bell row: "📹 n new camera alerts". `announce` (a new
 * alert) bumps it to the top and unread; otherwise only its words change.
 * Removed when nothing is new.
 */
export async function setBellCount(userId: string, announce?: { cameraName: string; siteName: string | null; trigger: Trigger; at: Date }) {
  const count = await newAlertCount(userId)
  const groupKey = bellKey(userId)
  if (count === 0) {
    await prisma.appNotification.deleteMany({ where: { userId, groupKey } })
    return count
  }
  const title = `📹 ${count} new camera alert${count === 1 ? '' : 's'}`
  if (announce) {
    await emitGroupedNotification({
      userId,
      type: FARM_ALERTS_BELL_TYPE,
      title,
      message: `Latest: ${TRIGGER_TEXT[announce.trigger]} at ${announce.cameraName}${announce.siteName ? ` (${announce.siteName})` : ''} · ${when(announce.at)}. Click to see them.`,
      linkUrl: '/cameras/alerts',
      metadata: { farmAlerts: true, count },
      groupKey,
    })
  } else {
    await prisma.appNotification.updateMany({ where: { userId, groupKey }, data: { title, metadata: { farmAlerts: true, count } } })
  }
  return count
}

/** Tell the person's open pages (the panel, 📹 count, corner card) */
async function tell(userId: string, kind: 'new' | 'update', id: string) {
  const [alert, count] = await Promise.all([alertRow(id), newAlertCount(userId)])
  if (alert) emitToUser(userId, 'farm-alert', { kind, alert, count })
}

/** Cameras this person paused (🔕) in MBM */
export async function pausedCameras(userId: string): Promise<Set<string>> {
  const rows = await prisma.farmCameraAlertPauses.findMany({ where: { userId }, select: { cameraId: true } })
  return new Set(rows.map(r => r.cameraId))
}

type GetPicture = () => Promise<Uint8Array<ArrayBuffer> | null>

/** The newest alert from this camera still in the New list */
function latestFor(userId: string, cameraId: string) {
  return prisma.farmCameraAlerts.findFirst({
    where: { userId, cameraId, dismissedAt: null },
    orderBy: { start: 'desc' },
    select: { id: true, start: true, end: true, times: true, trigger: true, findings: true, pictureFromEvent: true, seenAt: true },
  })
}

const canJoin = (a: { start: Date; end: Date | null }, at: number) =>
  at - a.start.getTime() < JOIN_SPAN_MS && (a.end === null || at - a.end.getTime() <= JOIN_GAP_MS)

/**
 * A camera newly found something (goingOn). Joins the camera's latest alert
 * when it's close enough (no notice); otherwise a new alert at once, with the
 * camera's picture now, a bell bump and a corner card.
 */
export async function alertGoingOn(userId: string, f: { cameraId: string; name: string; siteId: string | null; siteName: string | null; trigger: Trigger }, at: Date, picture: GetPicture) {
  const latest = await latestFor(userId, f.cameraId)
  if (latest && canJoin(latest, at.getTime())) {
    await prisma.farmCameraAlerts.update({
      where: { id: latest.id },
      data: { end: null, lastAt: at, trigger: widen(triggerOf(latest.trigger), f.trigger) },
    })
    await tell(userId, 'update', latest.id)
    return
  }
  const pic = await picture().catch(() => null)
  const a = await prisma.farmCameraAlerts.create({
    data: {
      userId, cameraId: f.cameraId, cameraName: f.name || `Camera ${f.cameraId}`, siteId: f.siteId, siteName: f.siteName,
      trigger: f.trigger, start: at, end: null, lastAt: at, findings: [], picture: pic && pic.length <= MAX_PICTURE_BYTES ? pic : null,
    },
    select: { id: true },
  })
  await setBellCount(userId, { cameraName: f.name, siteName: f.siteName, trigger: f.trigger, at })
  await tell(userId, 'new', a.id)
}

/** A camera stopped finding it: close its alert (an event coming later sets the exact end) */
export async function alertStopped(userId: string, cameraId: string, at: Date) {
  const latest = await latestFor(userId, cameraId)
  if (!latest || latest.end !== null) return
  await prisma.farmCameraAlerts.update({ where: { id: latest.id }, data: { end: at, lastAt: at } })
  await tell(userId, 'update', latest.id)
}

/**
 * A kept event (an id not seen before). Completes the camera's goingOn alert,
 * joins the latest alert, or starts a new one (guide §3.3, §3.4).
 */
export async function alertEvent(
  userId: string,
  e: { eventId: string; cameraId: string; name: string; siteId: string | null; siteName: string | null; trigger: Trigger; start: Date; end: Date | null; hasPicture: boolean },
  picture: GetPicture
) {
  const finding: Finding = { eventId: e.eventId, start: e.start.toISOString(), end: e.end ? e.end.toISOString() : null, trigger: e.trigger }
  const latest = await latestFor(userId, e.cameraId)
  const findings = (latest?.findings as unknown as Finding[]) || []
  if (latest && findings.some(x => x.eventId === e.eventId)) return

  // Made from goingOn and no event yet: this event is that same thing
  if (latest && findings.length === 0 && Math.abs(e.start.getTime() - latest.start.getTime()) <= COMPLETE_WINDOW_MS) {
    const pic = e.hasPicture ? await picture().catch(() => null) : null
    await prisma.farmCameraAlerts.update({
      where: { id: latest.id },
      data: {
        start: e.start, end: e.end, lastAt: e.end ?? e.start, findings: [finding] as never,
        trigger: widen(triggerOf(latest.trigger), e.trigger),
        ...(pic && pic.length <= MAX_PICTURE_BYTES ? { picture: pic, pictureFromEvent: true } : {}),
      },
    })
    await tell(userId, 'update', latest.id)
    return
  }

  // Back-to-back: join (no card, no chime, no bell bump)
  if (latest && canJoin(latest, e.start.getTime())) {
    const next = [...findings, finding].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    // Still going on while this finding is; otherwise the later of the two ends
    const end = e.end === null ? null : new Date(Math.max(e.end.getTime(), latest.end?.getTime() ?? 0))
    await prisma.farmCameraAlerts.update({
      where: { id: latest.id },
      data: {
        times: next.length, findings: next as never, end, lastAt: e.end ?? e.start,
        trigger: widen(triggerOf(latest.trigger), e.trigger),
      },
    })
    await tell(userId, 'update', latest.id)
    return
  }

  // A new alert, with its own picture
  const pic = e.hasPicture ? await picture().catch(() => null) : null
  const a = await prisma.farmCameraAlerts.create({
    data: {
      userId, cameraId: e.cameraId, cameraName: e.name || `Camera ${e.cameraId}`, siteId: e.siteId, siteName: e.siteName,
      trigger: e.trigger, start: e.start, end: e.end, lastAt: e.end ?? e.start, findings: [finding] as never,
      picture: pic && pic.length <= MAX_PICTURE_BYTES ? pic : null, pictureFromEvent: !!pic,
    },
    select: { id: true },
  })
  await setBellCount(userId, { cameraName: e.name, siteName: e.siteName, trigger: e.trigger, at: e.start })
  await tell(userId, 'new', a.id)
}

/** Hourly: older than 30 days goes, except watch later */
export async function cleanOldAlerts() {
  await prisma.farmCameraAlerts.deleteMany({ where: { start: { lt: new Date(Date.now() - KEEP_MS) }, laterAt: null } })
}
