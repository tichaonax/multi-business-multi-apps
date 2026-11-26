// MBM-345: where a page was opened from, for "← Back to …" buttons that
// return there instead of always to the POS. Next.js moves between pages
// without reloading, so document.referrer is no help — NavigationProvider
// records every page here (this tab only, sessionStorage), and BackLink reads
// the page before the current one.
//
// Going back (to the page before) trims the trail rather than adding to it,
// so Reports → Saved Reports → a report → back → back ends at Reports, not in
// a loop between the last two pages.

const KEY = 'mbm:navTrail'
const MAX = 30

const read = (): string[] => {
  try { const v = JSON.parse(sessionStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
const write = (trail: string[]) => {
  try { sessionStorage.setItem(KEY, JSON.stringify(trail.slice(-MAX))) } catch { /* private mode etc. */ }
}
const pathOf = (url: string) => url.split('?')[0].replace(/\/+$/, '') || '/'

/** Record a page visit (path + query) */
export function recordVisit(url: string) {
  const trail = read()
  const here = pathOf(url)
  const last = trail[trail.length - 1]
  if (last && pathOf(last) === here) { trail[trail.length - 1] = url; write(trail); return } // same page, new query
  const before = trail[trail.length - 2]
  if (before && pathOf(before) === here) { trail.pop(); trail[trail.length - 1] = url; write(trail); return } // went back
  trail.push(url)
  write(trail)
}

/** The page before `currentPath` in this tab, or null */
export function previousPage(currentPath: string): string | null {
  const here = pathOf(currentPath)
  const trail = read()
  // The current page may or may not be recorded yet (child effects run first)
  while (trail.length && pathOf(trail[trail.length - 1]) === here) trail.pop()
  return trail[trail.length - 1] ?? null
}

const NAMES: Record<string, string> = {
  pos: 'POS', reports: 'Reports', history: 'Saved Reports', saved: 'Saved Report',
  'end-of-day': 'End of Day', 'end-of-week': 'End of Week', dashboard: 'Dashboard',
  'sales-analytics': 'Sales Analytics', 'daily-item-sales': 'Item Sales', inventory: 'Inventory',
  orders: 'Orders', receipts: 'Receipts', 'daily-detail': 'Day Detail', eod: 'EOD',
}

/** "POS", "Reports", "Saved Reports", "Sales Analytics" … for a page path */
export function pageName(url: string): string {
  const parts = pathOf(url).split('/').filter(Boolean)
  if (!parts.length) return 'Home'
  // An id at the end (e.g. /reports/saved/<id>): name it by the segment before
  const last = /^[a-z0-9]{20,}$/i.test(parts[parts.length - 1]) && parts.length > 1 ? parts[parts.length - 2] : parts[parts.length - 1]
  return NAMES[last] ?? last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
