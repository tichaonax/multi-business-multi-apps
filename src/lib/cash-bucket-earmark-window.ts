// Shared by /api/cash-bucket and /api/cash-bucket/allocation-detail — both must
// agree on the exact same boundary, or the drill-down total won't match the
// summary line it was opened from. Rolling window (not "since start of this
// calendar month") so the list doesn't grow to 30 days of entries by month-end.
export const EARMARK_WINDOW_DAYS = 7

export function getEarmarkWindowStart(): Date {
  const start = new Date()
  start.setDate(start.getDate() - EARMARK_WINDOW_DAYS)
  start.setHours(0, 0, 0, 0)
  return start
}
