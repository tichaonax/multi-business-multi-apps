// MBM-340 — the camera alert list's filters (alert list guide §3.6), shared by
// the list route and the bulk actions (Mark n seen / Dismiss n take every
// alert that matches, not only those shown).
// Times are stored in UTC; the browser sends its offset (`tz`, minutes, as
// Date.getTimezoneOffset()) so day / hour / a time in the find box are the
// person's own local times.
import type { Prisma } from '@prisma/client'

export type AlertView = 'new' | 'later' | 'paused' | 'history'
export type HistoryState = 'new' | 'all' | 'seen' | 'dismissed'

export interface AlertFilter {
  view: AlertView
  state?: HistoryState
  q?: string
  site?: string
  kind?: 'all' | 'movement' | 'sound' | 'nopicture'
  day?: string // YYYY-MM-DD, local
  hour?: number | null // 0–23, local
  tz?: number // minutes, Date.getTimezoneOffset()
  since?: string // New tab: also keep alerts seen after the panel opened (so a played row stays put)
}

const DAY_MS = 24 * 60 * 60_000
const HOUR_MS = 60 * 60_000
const KEEP_MS = 30 * DAY_MS

/** Reads the filter from a query string or a JSON body */
export function readFilter(src: Record<string, unknown>): AlertFilter {
  const str = (k: string) => (typeof src[k] === 'string' ? (src[k] as string) : undefined)
  const view = (['new', 'later', 'paused', 'history'].includes(str('view') || '') ? str('view') : 'new') as AlertView
  const state = (['new', 'all', 'seen', 'dismissed'].includes(str('state') || '') ? str('state') : 'new') as HistoryState
  const kind = (['all', 'movement', 'sound', 'nopicture'].includes(str('kind') || '') ? str('kind') : 'all') as AlertFilter['kind']
  const hourRaw = src.hour === undefined || src.hour === '' || src.hour === null ? null : Number(src.hour)
  const tzRaw = Number(src.tz)
  const day = str('day')
  return {
    view,
    state,
    q: (str('q') || '').slice(0, 100),
    site: str('site') || undefined,
    kind,
    day: day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined,
    hour: hourRaw !== null && Number.isInteger(hourRaw) && hourRaw >= 0 && hourRaw <= 23 ? hourRaw : null,
    tz: Number.isFinite(tzRaw) && Math.abs(tzRaw) <= 14 * 60 ? tzRaw : 0,
    since: str('since'),
  }
}

/**
 * A time in the find box: "1:38", "1:38 pm", "13:38", "gate 1 pm". A number
 * alone ("Gate 2") is not a time. Returns the hours (24 h) it may mean and the
 * rest of the text.
 */
export function parseTimeInFind(q: string): { minutes: number[]; rest: string; text: string } | null {
  const m = q.match(/(?:^|\s)(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?(?=\s|$)/i)
  if (!m || (!m[2] && !m[3])) return null
  const h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  if (h > 23 || min > 59) return null
  const ap = m[3]?.toLowerCase().startsWith('p') ? 'pm' : m[3] ? 'am' : null
  let hours: number[]
  if (ap) {
    if (h < 1 || h > 12) return null
    hours = [ap === 'pm' ? (h % 12) + 12 : h % 12]
  } else {
    hours = h >= 13 || h === 0 ? [h] : [h % 12, (h % 12) + 12] // no am/pm: morning and afternoon
  }
  return { minutes: hours.map(x => x * 60 + min), rest: q.replace(m[0], ' ').trim(), text: m[0].trim() }
}

/** UTC time of a local day's midnight */
function localMidnightUtc(day: string, tz: number) {
  const [y, mo, d] = day.split('-').map(Number)
  return Date.UTC(y, mo - 1, d) + tz * 60_000
}

function todayLocal(tz: number) {
  return new Date(Date.now() - tz * 60_000).toISOString().slice(0, 10)
}

function fmt(ms: number, tz: number) {
  const d = new Date(ms - tz * 60_000)
  const h = d.getUTCHours()
  return `${((h + 11) % 12) + 1}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

function dayLabel(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/**
 * The Prisma `where` for a person and filter, plus a line saying what a time
 * in the find box matched ("12:38 AM – 2:38 AM and 12:38 PM – 2:38 PM on Sun, Nov 22").
 */
export function buildWhere(userId: string, f: AlertFilter, opts: { ignoreView?: boolean } = {}): { where: Prisma.FarmCameraAlertsWhereInput; timeNote: string | null } {
  const and: Prisma.FarmCameraAlertsWhereInput[] = [{ userId }]
  const tz = f.tz ?? 0

  if (!opts.ignoreView) {
    if (f.view === 'new') {
      // Not dismissed, and new, or seen since the panel opened (a played row stays put)
      const since = f.since && !Number.isNaN(Date.parse(f.since)) ? new Date(f.since) : null
      and.push({ dismissedAt: null })
      and.push(since ? { OR: [{ seenAt: null }, { seenAt: { gte: since } }] } : { seenAt: null })
    } else if (f.view === 'later') {
      and.push({ laterAt: { not: null } })
    } else if (f.view === 'history') {
      and.push({ OR: [{ start: { gte: new Date(Date.now() - KEEP_MS) } }, { laterAt: { not: null } }] })
      if (f.state === 'new') and.push({ seenAt: null, dismissedAt: null })
      else if (f.state === 'seen') and.push({ seenAt: { not: null }, dismissedAt: null })
      else if (f.state === 'dismissed') and.push({ dismissedAt: { not: null } })
    }
  }

  if (f.site) and.push({ siteId: f.site })
  if (f.kind === 'movement') and.push({ trigger: { in: ['motion', 'both'] } })
  else if (f.kind === 'sound') and.push({ trigger: { in: ['sound', 'both'] } })
  else if (f.kind === 'nopicture') and.push({ picture: null })

  let q = (f.q || '').trim()
  const time = q ? parseTimeInFind(q) : null
  if (time) q = time.rest
  if (q) and.push({ OR: [{ cameraName: { contains: q, mode: 'insensitive' } }, { siteName: { contains: q, mode: 'insensitive' } }] })

  // Day / hour / a time: with no day, a time or an hour is today's
  const day = f.day || (time || f.hour !== null && f.hour !== undefined ? todayLocal(tz) : undefined)
  let timeNote: string | null = null
  if (day) {
    const midnight = localMidnightUtc(day, tz)
    if (time) {
      const windows = time.minutes.map(min => ({ from: midnight + min * 60_000 - HOUR_MS, to: midnight + min * 60_000 + HOUR_MS }))
      and.push({ OR: windows.map(w => ({ start: { gte: new Date(w.from), lt: new Date(w.to) } })) })
      timeNote = `${windows.map(w => `${fmt(w.from, tz)} – ${fmt(w.to, tz)}`).join(' and ')} on ${dayLabel(day)}`
    }
    if (f.hour !== null && f.hour !== undefined) {
      const from = midnight + f.hour * HOUR_MS
      and.push({ start: { gte: new Date(from), lt: new Date(from + HOUR_MS) } })
    } else if (!time) {
      and.push({ start: { gte: new Date(midnight), lt: new Date(midnight + DAY_MS) } })
    }
  }
  return { where: { AND: and }, timeNote }
}

/** True when any filter (not the tab) is on */
export const filterOn = (f: AlertFilter) => !!(f.q || f.site || (f.kind && f.kind !== 'all') || f.day || (f.hour !== null && f.hour !== undefined))
