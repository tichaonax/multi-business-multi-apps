// MBM-360: counts a page visit for "My shortcuts" — at most once per page per
// 10 minutes in this tab, so refreshes and quick back-and-forth don't inflate it.
import { shortcutPath } from '@/lib/shortcuts/page-shortcuts'

const KEY = 'mbm:shortcutVisits'
const GAP_MS = 10 * 60 * 1000

export function countShortcutVisit(url: string) {
  const path = shortcutPath(url)
  if (!path) return
  try {
    const seen = JSON.parse(sessionStorage.getItem(KEY) || '{}') as Record<string, number>
    if (Date.now() - (seen[path] || 0) < GAP_MS) return
    seen[path] = Date.now()
    sessionStorage.setItem(KEY, JSON.stringify(seen))
  } catch { /* no storage: count it anyway */ }
  fetch('/api/user/shortcuts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
    keepalive: true,
  }).catch(() => { /* offline: not counted */ })
}
