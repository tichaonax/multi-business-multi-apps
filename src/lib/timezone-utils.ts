/**
 * Shared timezone-boundary helpers for bucketing records into a business's
 * local calendar day, independent of the server's own OS timezone.
 *
 * Previously duplicated verbatim in src/app/api/universal/daily-sales/route.ts
 * and src/app/api/restaurant/daily-sales/route.ts — consolidated here so
 * every caller shares one implementation instead of risking the two drifting
 * apart (dev runs in Houston CDT, production in Africa/Harare UTC+2 — a
 * fixed reference point matters here).
 *
 * NOT the same thing as receipt-numbering.ts's own getTodayInTimezone — that
 * one has different semantics (a 5am business-day cutover for receipt
 * sequence resets, not a plain midnight boundary) and is intentionally left
 * separate.
 */

/** UTC offset, in ms, for an IANA timezone at a given moment. */
export function getTimezoneOffsetMs(timezone: string, date: Date = new Date()): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone })
  return new Date(tzStr).getTime() - new Date(utcStr).getTime()
}

/**
 * The midnight-to-midnight boundary, in a given IANA timezone, for whichever
 * calendar day `referenceDate` falls on in that timezone — returned as UTC
 * Date objects ready to use directly in a Prisma date-range filter.
 */
export function getDayBoundaryInTimezone(
  timezone: string,
  referenceDate: Date = new Date()
): { start: Date; end: Date; dateStr: string } {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(referenceDate)

  const [year, month, day] = dateStr.split('-').map(Number)

  const midnightUTC = Date.UTC(year, month - 1, day, 0, 0, 0)
  const offsetMs = getTimezoneOffsetMs(timezone, new Date(midnightUTC))
  const start = new Date(midnightUTC - offsetMs)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  return { start, end, dateStr }
}

/** Today's boundary in the given timezone — a thin, named convenience over getDayBoundaryInTimezone. */
export function getTodayInTimezone(timezone: string): { start: Date; end: Date; dateStr: string } {
  return getDayBoundaryInTimezone(timezone, new Date())
}

/** The default timezone to use when a caller doesn't have a specific one to pass (e.g. a background job with no request/browser to ask). */
export function getServerDefaultTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
