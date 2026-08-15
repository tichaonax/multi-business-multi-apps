import { getLocalDateString } from '@/lib/utils'

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | ''

export const DATE_PRESET_LABELS: Record<Exclude<DatePreset, 'custom' | ''>, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Last 7 Days',
  month: 'This Month',
}

/** ISO (yyyy-mm-dd) from/to range for a named preset, anchored to local "now". */
export function getPresetDateRange(preset: 'today' | 'yesterday' | 'week' | 'month'): { from: string; to: string } {
  const now = new Date()
  const today = getLocalDateString(now)
  let from = today
  let to = today
  if (preset === 'yesterday') {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    from = getLocalDateString(d)
    to = from
  } else if (preset === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    from = getLocalDateString(d)
  } else if (preset === 'month') {
    from = `${today.slice(0, 7)}-01`
  }
  return { from, to }
}

/** ISO date (yyyy-mm-dd) → display format (dd/mm/yyyy). */
export function isoToDisplay(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

/** Display format (dd/mm/yyyy) → ISO (yyyy-mm-dd); returns '' if invalid/incomplete. */
export function displayToIso(display: string): string {
  if (!display) return ''
  const parts = display.split('/')
  if (parts.length !== 3) return ''
  const [d, m, y] = parts
  if (!d || !m || !y || y.length !== 4) return ''
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  const date = new Date(iso)
  return isNaN(date.getTime()) ? '' : iso
}
