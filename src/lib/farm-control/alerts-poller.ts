// MBM-332 — Farm Control alerts in MBM's notification bell and the read-only
// "Farm Camera Alerts" chat (plan MBM-332; guide §7.11, rev 4).
//
// Every minute, for each person with a Linked Farm Control id and at least
// one camera MBM allows them (and bell or chat alerts on):
//   GET /alerts (first time) or /alerts?changedSince=<Farm Control's last now>
// then MBM's own filter on top (the same as the strip): camera alerts only for
// cameras MBM allows them; site / node alerts only for sites where they have
// an allowed camera. Alerts under a parent (cameras at an unreachable site)
// are not announced on their own: they're counted into the parent's.
//
// - Opened: a bell row (groupKey farm-alert:<id>, refreshed on repeats) and a
//   chat line visible to everyone it applies to (one line per event).
// - Back within 10 minutes of resolving: the bell row is refreshed and counts
//   the repeats; no new chat line (decision A5).
// - Resolved: the person's bell row is removed and a "✅ Resolved" chat line
//   is posted (A3).
// Dedupe per person by alert id + changedAt (farm_control_alert_deliveries;
// transient, not backed up). Runs in the server process: no next/server.
import { prisma } from '@/lib/prisma'
import { emitGroupedNotification } from '@/lib/notifications/notification-emitter'
import { emitToUsers } from '@/lib/customer-display/socket-server'
import { FARM_CAMERA_ALERTS_ROOM_NAME, getOrCreateSystemRoom, postSystemMessage } from '@/lib/chat/rooms'
import { getCameraPreferences, getCameraSiteIds, getFarmControlIntegration, getUserCameraAccess, isIntegrationReady, loadCameraUser } from './server'
import { farmErrorText, farmServerCall } from './server-api'

export const FARM_ALERT_NOTIFICATION_TYPE = 'FARM_CAMERA_ALERT' as const
const INTERVAL_MS = 60_000
const BACK_AGAIN_MS = 10 * 60_000
const KEEP_RESOLVED_MS = 30 * 24 * 60 * 60_000

interface FarmAlert {
  id: number | string
  kind: string
  level: string
  state: 'open' | 'resolved'
  message: string
  siteId?: number | string | null
  siteName?: string | null
  subject?: { kind: string; id: number | string } | null
  openedAt?: string | null
  changedAt: string
  resolvedAt?: string | null
  times?: number
  parentId?: number | string | null
}

const KIND_LABEL: Record<string, string> = {
  'camera.problem': 'Camera problem',
  'site.unreachable': 'Site not reachable',
  'site.node-silent': "Site's gateway is silent",
  'node.failing': 'Node failing',
  'site.approvals': 'Devices waiting for approval',
  'site.fingerprints': 'Devices held back by the network ID check',
}
const kindLabel = (kind: string) => KIND_LABEL[kind] || 'Farm Control alert'
const levelIcon = (level: string) => (level === 'bad' ? '🔴' : '🟡')
const linkFor = (a: FarmAlert) => (a.subject?.kind === 'camera' ? `/cameras?open=${encodeURIComponent(String(a.subject.id))}` : '/cameras')

function since(from: Date | null | undefined, to: Date) {
  if (!from) return ''
  const min = Math.max(1, Math.round((to.getTime() - from.getTime()) / 60_000))
  if (min < 60) return ` after ${min} min`
  const h = Math.floor(min / 60)
  return ` after ${h} h${min % 60 ? ` ${min % 60} min` : ''}`
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`

/** One chat line per event, shared by everyone it applies to in this run */
interface ChatEvent { text: string; linkUrl: string; alertId: string; changedAt: Date; userIds: string[] }

let running = false
let lastCleanup = 0

export async function runFarmAlertsOnce(): Promise<void> {
  if (running) return
  running = true
  try {
    const integration = await getFarmControlIntegration()
    if (!isIntegrationReady(integration)) return

    const links = await prisma.farmControlUserLinks.findMany({
      where: { status: 'LINKED', users: { isActive: true } },
      select: { userId: true, alertsCursor: true, users: { select: { name: true } } },
    })

    const chat = new Map<string, ChatEvent>()
    let checked = 0
    let failures = 0
    let lastError: string | null = null

    for (const link of links) {
      const prefs = await getCameraPreferences(link.userId)
      if (!prefs.alertsBell && !prefs.alertsChat) continue
      const user = await loadCameraUser(link.userId)
      if (!user) continue
      const access = await getUserCameraAccess(user)
      if (access.cameraIds.length === 0) continue
      checked++

      let answer: { alerts?: FarmAlert[]; now?: string }
      try {
        const path = link.alertsCursor ? `/alerts?changedSince=${encodeURIComponent(link.alertsCursor.toISOString())}` : '/alerts'
        answer = await farmServerCall(integration, { id: link.userId, name: link.users.name }, 'GET', path)
      } catch (e) {
        failures++
        lastError = farmErrorText(e)
        await prisma.farmControlUserLinks.update({ where: { userId: link.userId }, data: { alertsCheckedAt: new Date(), alertsError: lastError } })
        continue
      }
      const now = answer.now ? new Date(answer.now) : new Date()
      await prisma.farmControlUserLinks.update({
        where: { userId: link.userId },
        data: { alertsCursor: Number.isNaN(now.getTime()) ? new Date() : now, alertsCheckedAt: new Date(), alertsError: null },
      })

      const cameras = new Set(access.cameraIds)
      const sites = await getCameraSiteIds(access.cameraIds)
      const visible = (a: FarmAlert) =>
        a.subject?.kind === 'camera' ? cameras.has(String(a.subject.id)) : a.siteId != null && sites.has(String(a.siteId))

      // Oldest first, so open → resolved in one answer lands in that order
      const alerts = (answer.alerts || []).filter(visible).sort((a, b) => Date.parse(a.changedAt) - Date.parse(b.changedAt))
      for (const a of alerts) await deliver(link.userId, prefs, a, chat)
    }

    // The chat lines: one per event, to everyone it applies to
    if (chat.size > 0) {
      const everyone = [...new Set([...chat.values()].flatMap(e => e.userIds))]
      const room = await getOrCreateSystemRoom(FARM_CAMERA_ALERTS_ROOM_NAME, everyone)
      for (const e of chat.values()) {
        const payload = await postSystemMessage(room.id, e.text, e.linkUrl, e.userIds)
        emitToUsers(e.userIds, 'chat:message', payload)
        await prisma.farmControlAlertDeliveries.updateMany({
          where: { alertId: e.alertId, userId: { in: e.userIds }, changedAt: e.changedAt },
          data: { chatMessageId: (payload as { id?: string })?.id ?? null },
        })
      }
    }

    await prisma.farmControlIntegrations.update({
      where: { id: integration.id },
      data: { alertsLastRunAt: new Date(), alertsUsers: checked, alertsLastError: failures > 0 && failures === checked ? lastError : null },
    })

    if (Date.now() - lastCleanup > 60 * 60_000) {
      lastCleanup = Date.now()
      await prisma.farmControlAlertDeliveries.deleteMany({ where: { state: 'resolved', updatedAt: { lt: new Date(Date.now() - KEEP_RESOLVED_MS) } } })
    }
  } catch (err) {
    console.error('[farm-alerts] run failed:', err)
  } finally {
    running = false
  }
}

async function deliver(
  userId: string,
  prefs: { alertsBell: boolean; alertsChat: boolean },
  a: FarmAlert,
  chat: Map<string, ChatEvent>
) {
  const alertId = String(a.id)
  const changedAt = new Date(a.changedAt)
  if (Number.isNaN(changedAt.getTime())) return
  const prev = await prisma.farmControlAlertDeliveries.findUnique({ where: { userId_alertId: { userId, alertId } } })
  // Seen already (the time passed to changedSince is included, so repeats come)
  if (prev && prev.state === a.state && prev.changedAt.getTime() >= changedAt.getTime()) return

  const row = {
    parentAlertId: a.parentId != null ? String(a.parentId) : null,
    kind: a.kind,
    level: a.level,
    state: a.state,
    message: a.message,
    siteName: a.siteName ?? null,
    subjectKind: a.subject?.kind ?? null,
    subjectId: a.subject ? String(a.subject.id) : null,
    openedAt: a.openedAt ? new Date(a.openedAt) : null,
    changedAt,
    resolvedAt: a.resolvedAt ? new Date(a.resolvedAt) : null,
    times: a.times ?? 1,
  }
  const save = (extra: Record<string, unknown> = {}) =>
    prisma.farmControlAlertDeliveries.upsert({
      where: { userId_alertId: { userId, alertId } },
      create: { userId, alertId, ...row, ...extra },
      update: { ...row, ...extra },
    })

  // Under a parent (a camera at an unreachable site): counted, not announced
  if (a.parentId != null) { await save(); return }

  const groupKey = `farm-alert:${alertId}`
  const label = kindLabel(a.kind)
  const where = a.siteName ? ` · ${a.siteName}` : ''

  if (a.state === 'open') {
    const backSoon = !!prev && prev.state === 'resolved' && !!prev.resolvedAt && changedAt.getTime() - prev.resolvedAt.getTime() < BACK_AGAIN_MS
    await save({ notifiedAt: new Date() })
    if (prefs.alertsBell) {
      const children = await prisma.farmControlAlertDeliveries.count({ where: { userId, parentAlertId: alertId, state: 'open' } })
      const times = a.times && a.times > 1 ? ` (${ordinal(a.times)} time)` : ''
      await emitGroupedNotification({
        userId,
        type: FARM_ALERT_NOTIFICATION_TYPE,
        title: `${levelIcon(a.level)} ${label}${where}${times}`,
        message: `${a.message}${children > 0 ? ` (and ${children} camera${children === 1 ? '' : 's'} there)` : ''}`,
        linkUrl: linkFor(a),
        metadata: { alertId, kind: a.kind, level: a.level, siteName: a.siteName ?? null, times: a.times ?? 1 },
        groupKey,
      })
    }
    if (prefs.alertsChat && !backSoon) {
      const again = a.times && a.times > 1 ? `🔁 Again (${ordinal(a.times)} time) — ` : ''
      addChat(chat, `${alertId}|${a.changedAt}|open`, {
        text: `${levelIcon(a.level)} ${again}${label} — ${a.message}`,
        linkUrl: linkFor(a),
        alertId,
        changedAt,
      }, userId)
    }
    return
  }

  // Resolved: only tell people who were told it opened
  await save()
  if (!prev || prev.state !== 'open') return
  await prisma.appNotification.deleteMany({ where: { userId, groupKey } })
  if (prefs.alertsChat) {
    const resolvedAt = a.resolvedAt ? new Date(a.resolvedAt) : changedAt
    addChat(chat, `${alertId}|${a.changedAt}|resolved`, {
      text: `✅ Resolved — ${a.message}${since(prev.openedAt ?? prev.changedAt, resolvedAt)}`,
      linkUrl: linkFor(a),
      alertId,
      changedAt,
    }, userId)
  }
}

function addChat(chat: Map<string, ChatEvent>, key: string, e: Omit<ChatEvent, 'userIds'>, userId: string) {
  const cur = chat.get(key)
  if (cur) { if (!cur.userIds.includes(userId)) cur.userIds.push(userId) }
  else chat.set(key, { ...e, userIds: [userId] })
}

let started = false

/** Started from server.ts; checks every minute (the guide's suggested pace). */
export function startFarmAlertsScheduler(): void {
  if (started) return
  started = true
  setTimeout(() => { runFarmAlertsOnce() }, 15_000) // shortly after start-up
  setInterval(() => { runFarmAlertsOnce() }, INTERVAL_MS)
  console.log('[Farm Alerts] Started — checking Farm Control alerts every minute')
}
