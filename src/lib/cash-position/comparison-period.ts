/**
 * MBM-287 Decision #3: the prior period to compare a summary card against —
 * calendar-aligned per date mode (this month vs. last calendar month, this
 * week vs. last calendar week, today vs. yesterday), not a rolling
 * equal-length shift. A rolling shift only applies to custom ranges, which
 * have no natural calendar alignment.
 */

export type DateMode = 'day' | 'week' | 'month' | 'custom'

export interface Period {
  start: Date
  end: Date // exclusive
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

// Monday-start week, matching the date presets already used elsewhere in the app.
function startOfWeek(d: Date): Date {
  const r = startOfDay(d)
  const day = r.getDay() // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1
  r.setDate(r.getDate() - diff)
  return r
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function getComparisonPeriod(mode: DateMode, period: Period): Period {
  if (mode === 'day') {
    const start = new Date(period.start)
    start.setDate(start.getDate() - 1)
    const end = new Date(period.end)
    end.setDate(end.getDate() - 1)
    return { start, end }
  }
  if (mode === 'week') {
    const start = startOfWeek(period.start)
    start.setDate(start.getDate() - 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return { start, end }
  }
  if (mode === 'month') {
    const start = startOfMonth(period.start)
    start.setMonth(start.getMonth() - 1)
    const end = startOfMonth(period.start)
    return { start, end }
  }
  // custom — no calendar alignment; shift back by the same length.
  const lengthMs = period.end.getTime() - period.start.getTime()
  return { start: new Date(period.start.getTime() - lengthMs), end: new Date(period.start) }
}
