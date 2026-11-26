// MBM-345: the date range presets, in one place, for the standard date range
// popup (src/components/ui/date-range-picker.tsx) and every page that picks a
// range.
//
// The presets the reports already had (DateRangeSelector) give exactly the
// dates they gave before, so no report changes:
//   - the end is "now", except Yesterday and whole periods (a month, last
//     week, last month, last year), which end at the start of their last day
//   - "Last N days" / "N months" count back from now (time of day included)
//   - a picked day (Specific date, From / To) is that day at 12:00
// Consumers that need whole days use toYmd() on start and end.

export interface DateRange {
  start: Date
  end: Date
}

export type PresetKey =
  | 'today' | 'yesterday' | '7' | '30' | '90'
  | 'week' | 'lastWeek'
  | 'mtd' | 'lastMonth'
  | 'ytd' | 'lastYear' | '6m' | '1y' | '2y' | '5y'

export interface Preset {
  key: PresetKey
  label: string
  group: 'Days' | 'Weeks' | 'Months' | 'Years'
  range: (now: Date) => DateRange
}

const day = (y: number, m: number, d: number) => new Date(y, m, d)
const startOfDay = (d: Date) => day(d.getFullYear(), d.getMonth(), d.getDate())
const daysBack = (now: Date, n: number) => { const s = new Date(now); s.setDate(now.getDate() - n); return s }
const monthsBack = (now: Date, n: number) => { const s = new Date(now); s.setMonth(s.getMonth() - n); return s }
/** Monday of the week `d` is in */
const monday = (d: Date) => { const m = startOfDay(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m }

export const PRESETS: Preset[] = [
  { key: 'today', label: 'Today', group: 'Days', range: now => ({ start: startOfDay(now), end: now }) },
  { key: 'yesterday', label: 'Yesterday', group: 'Days', range: now => { const y = startOfDay(daysBack(now, 1)); return { start: y, end: new Date(y) } } },
  { key: '7', label: 'Last 7 days', group: 'Days', range: now => ({ start: daysBack(now, 7), end: now }) },
  { key: '30', label: 'Last 30 days', group: 'Days', range: now => ({ start: daysBack(now, 30), end: now }) },
  { key: '90', label: 'Last 90 days', group: 'Days', range: now => ({ start: daysBack(now, 90), end: now }) },
  { key: 'week', label: 'This week', group: 'Weeks', range: now => ({ start: monday(now), end: now }) },
  { key: 'lastWeek', label: 'Last week', group: 'Weeks', range: now => { const s = monday(daysBack(now, 7)); const e = new Date(s); e.setDate(s.getDate() + 6); return { start: s, end: e } } },
  { key: 'mtd', label: 'Month to date', group: 'Months', range: now => ({ start: day(now.getFullYear(), now.getMonth(), 1), end: now }) },
  { key: 'lastMonth', label: 'Last month', group: 'Months', range: now => ({ start: day(now.getFullYear(), now.getMonth() - 1, 1), end: day(now.getFullYear(), now.getMonth(), 0) }) },
  { key: 'ytd', label: 'Year to date', group: 'Years', range: now => ({ start: day(now.getFullYear(), 0, 1), end: now }) },
  { key: 'lastYear', label: 'Last year', group: 'Years', range: now => ({ start: day(now.getFullYear() - 1, 0, 1), end: day(now.getFullYear() - 1, 11, 31) }) },
  { key: '6m', label: '6 months', group: 'Years', range: now => ({ start: monthsBack(now, 6), end: now }) },
  { key: '1y', label: '1 year', group: 'Years', range: now => ({ start: monthsBack(now, 12), end: now }) },
  { key: '2y', label: '2 years', group: 'Years', range: now => ({ start: monthsBack(now, 24), end: now }) },
  { key: '5y', label: '5 years', group: 'Years', range: now => ({ start: monthsBack(now, 60), end: now }) },
]

export const ALL_PRESET_KEYS = PRESETS.map(p => p.key)

export function presetRange(key: PresetKey, now: Date = new Date()): DateRange {
  const p = PRESETS.find(x => x.key === key)
  if (!p) throw new Error(`Unknown date preset ${key}`)
  return p.range(now)
}

/** A whole month (month 0–11): its 1st to its last day */
export function monthRange(year: number, month: number): DateRange {
  return { start: day(year, month, 1), end: day(year, month + 1, 0) }
}

/** YYYY-MM-DD in local time */
export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A picked day (YYYY-MM-DD) as 12:00 local — what the reports have always used */
export function fromYmd(s: string): Date {
  return new Date(`${s}T12:00:00`)
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Which preset a range is (the start day, and the length or the end day), or null */
export function matchPreset(range: DateRange, keys: PresetKey[] = ALL_PRESET_KEYS, now: Date = new Date()): PresetKey | null {
  const sameDay = (a: Date, b: Date) => toYmd(a) === toYmd(b)
  for (const k of keys) {
    const r = presetRange(k, now)
    if (!sameDay(r.start, range.start)) continue
    // "to now" presets: the end is today; whole periods: the same end day
    if (sameDay(r.end, range.end) || (sameDay(r.end, now) && sameDay(range.end, now))) return k
  }
  return null
}

/** "Today", "Nov 1 – Nov 15", "Nov 3", "March 2026" … for a trigger or a key */
export function describeRange(range: DateRange, opts: { presetKey?: PresetKey | null; month?: { year: number; month: number } | null; allTime?: boolean } = {}): string {
  if (opts.allTime) return 'All time'
  if (opts.month) return `${MONTH_NAMES[opts.month.month]} ${opts.month.year}`
  const p = opts.presetKey ? PRESETS.find(x => x.key === opts.presetKey) : null
  if (p) return p.label
  const thisYear = new Date().getFullYear()
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(d.getFullYear() !== thisYear ? { year: 'numeric' } : {}) })
  const a = fmt(range.start), b = fmt(range.end)
  return a === b ? a : `${a} – ${b}`
}
