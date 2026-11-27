/**
 * MBM-351 — signed-in sessions: record them, check them on every request, end them.
 *
 * Sign-in is a JWT cookie, so on its own the server cannot end a session.
 * Every JWT carries a `sessionId`; this module keeps a `user_sessions` row per
 * sessionId, and the NextAuth `jwt` callback (src/lib/auth.ts) asks
 * `isSessionAllowed()` on every request. When it says no, the callback throws,
 * NextAuth clears the cookie and the request counts as signed out, on whichever
 * workstation that session lives.
 *
 * A sign-out with a countdown sets `endedAt` in the future, so the user keeps
 * working (e.g. finishes a sale) until then.
 */
import { prisma } from './prisma'

const CHECK_MS = 10_000        // how long one answer is trusted before re-reading the row
const SEEN_MS = 2 * 60_000     // how often lastSeenAt is written
export const SESSION_IDLE_MS = 8 * 60 * 60_000 // same as the JWT maxAge in auth.ts

type CacheEntry = { checkedAt: number; endsAt: number | null; blocked: boolean; seenAt: number }
const cache = new Map<string, CacheEntry>()

/** "POS app (Windows)", "Chrome (Android)", … from a User-Agent. */
export function describeDevice(ua: string | null | undefined): string {
  if (!ua) return 'Unknown'
  const os = /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad/i.test(ua) ? 'iOS'
    : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS/i.test(ua) ? 'Mac'
    : /Linux/i.test(ua) ? 'Linux' : 'Unknown OS'
  const pos = ua.match(/MBM-POS\/([\d.]+)/)
  if (pos) return `POS app ${pos[1]} (${os})`
  const app = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  return `${app} (${os})`
}

/** The desktop POS app (1.0.37+) adds `host/<computer name>` to its User-Agent. */
export function hostnameFromUserAgent(ua: string | null | undefined): string | null {
  const m = ua?.match(/\bhost\/([A-Za-z0-9._-]{1,63})/)
  return m ? m[1] : null
}

/** Best-effort request details; only available inside a request (route handler). */
async function requestDetails(): Promise<{ ip: string | null; ua: string | null }> {
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    const fwd = h.get('x-forwarded-for')?.split(',')[0]?.trim()
    const ip = fwd || h.get('x-real-ip') || null
    return { ip: ip?.replace(/^::ffff:/, '') ?? null, ua: h.get('user-agent') }
  } catch {
    return { ip: null, ua: null }
  }
}

/** Called at sign-in (jwt callback, `user` present). */
export async function registerSession(sessionId: string, userId: string): Promise<void> {
  const { ip, ua } = await requestDetails()
  const data = {
    ipAddress: ip,
    userAgent: ua?.slice(0, 500) ?? null,
    deviceLabel: describeDevice(ua),
    hostname: hostnameFromUserAgent(ua),
  }
  await prisma.userSessions.upsert({
    where: { id: sessionId },
    create: { id: sessionId, userId, ...data },
    update: { lastSeenAt: new Date(), ...data },
  })
  cache.set(sessionId, { checkedAt: Date.now(), endsAt: null, blocked: false, seenAt: Date.now() })
}

/**
 * Called on every request (jwt callback, no `user`). False = end this session now.
 * Never throws: if the database can't be read, the session carries on.
 */
export async function isSessionAllowed(sessionId: string | undefined, userId: string | undefined, loginTime?: number): Promise<boolean> {
  if (!sessionId || !userId) return true
  const now = Date.now()
  let entry = cache.get(sessionId)

  if (!entry || now - entry.checkedAt > CHECK_MS) {
    try {
      const [row, user] = await Promise.all([
        prisma.userSessions.findUnique({ where: { id: sessionId }, select: { endedAt: true } }),
        prisma.users.findUnique({ where: { id: userId }, select: { isSuspended: true, isActive: true } }),
      ])
      if (!row) {
        // A session from before MBM-351 was deployed — register it so it shows on the screen
        const { ip, ua } = await requestDetails()
        await prisma.userSessions.create({
          data: {
            id: sessionId, userId,
            loginAt: loginTime ? new Date(loginTime) : new Date(),
            ipAddress: ip, userAgent: ua?.slice(0, 500) ?? null,
            deviceLabel: describeDevice(ua), hostname: hostnameFromUserAgent(ua),
          },
        }).catch(() => { /* another request registered it first */ })
      }
      entry = {
        checkedAt: now,
        endsAt: row?.endedAt ? row.endedAt.getTime() : null,
        blocked: !user || user.isSuspended || !user.isActive,
        seenAt: row ? (entry?.seenAt ?? 0) : now,
      }
      cache.set(sessionId, entry)
    } catch (e) {
      console.error('[user-sessions] check failed, allowing session:', e)
      return true
    }
  }

  if (entry.blocked) return false
  if (entry.endsAt !== null && entry.endsAt <= now) return false

  if (now - entry.seenAt > SEEN_MS) {
    entry.seenAt = now
    const { ip, ua } = await requestDetails()
    prisma.userSessions.update({
      where: { id: sessionId },
      data: {
        lastSeenAt: new Date(),
        ...(ip ? { ipAddress: ip } : {}),
        ...(ua ? { userAgent: ua.slice(0, 500), deviceLabel: describeDevice(ua), hostname: hostnameFromUserAgent(ua) } : {}),
      },
    }).catch(() => {})
  }
  return true
}

/** The user signed out themselves. */
export async function markSignedOut(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return
  cache.delete(sessionId)
  await prisma.userSessions.updateMany({
    where: { id: sessionId, endedAt: null },
    data: { endedAt: new Date(), endReason: 'SIGNED_OUT' },
  }).catch(() => {})
}

/**
 * End sessions (now, or after `delaySeconds`). Returns the sessions it ended.
 * A session already ending sooner keeps its earlier time.
 */
export async function endSessions(
  sessionIds: string[],
  opts: { reason: 'FORCED' | 'SUSPENDED'; endedBy: string; message: string | null; delaySeconds: number }
): Promise<{ id: string; userId: string; endsAt: Date }[]> {
  if (sessionIds.length === 0) return []
  const endsAt = new Date(Date.now() + Math.max(0, opts.delaySeconds) * 1000)
  const open = await prisma.userSessions.findMany({
    where: { id: { in: sessionIds }, OR: [{ endedAt: null }, { endedAt: { gt: endsAt } }] },
    select: { id: true, userId: true },
  })
  if (open.length === 0) return []
  await prisma.userSessions.updateMany({
    where: { id: { in: open.map(s => s.id) } },
    data: { endedAt: endsAt, endReason: opts.reason, endedBy: opts.endedBy, endMessage: opts.message },
  })
  open.forEach(s => cache.delete(s.id))
  return open.map(s => ({ ...s, endsAt }))
}

/** Forget cached answers for a user (after suspending or lifting a suspension). */
export function forgetUser(userSessionIds: string[]): void {
  userSessionIds.forEach(id => cache.delete(id))
}

/** Sessions idle longer than the JWT lifetime can no longer be used — close their rows. */
export async function closeExpiredSessions(): Promise<void> {
  const cutoff = new Date(Date.now() - SESSION_IDLE_MS)
  await prisma.userSessions.updateMany({
    where: { endedAt: null, lastSeenAt: { lt: cutoff } },
    data: { endedAt: new Date(), endReason: 'EXPIRED' },
  }).catch(() => {})
}
