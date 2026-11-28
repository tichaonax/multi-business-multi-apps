// MBM-360: "My shortcuts" — which page a visit counts as, its name, and how
// the most useful ones are picked. Used by the API (server) and the
// ⭐ My shortcuts menu (browser).
import { pageName } from '@/lib/nav-trail'

/** A record id: a cuid / uuid / long token */
const isId = (seg: string) => /^[a-z0-9]{20,}$/i.test(seg) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(seg) || /^\d+$/.test(seg)

/** Pages never offered as shortcuts */
const SKIP = [/^\/$/, /^\/auth\b/, /^\/api\b/, /^\/_next\b/, /^\/customer-display\b/, /^\/offline\b/, /^\/kiosk\b/]

/**
 * The page a visit counts as: no query string, and cut at the first record id
 * ("/expense-accounts/<id>/payments" → "/expense-accounts"), so a page counts
 * once, not once per receipt / item. null: not offered as a shortcut.
 */
export function shortcutPath(url: string): string | null {
  const path = (url || '').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  const parts: string[] = []
  for (const seg of path.split('/').filter(Boolean)) {
    if (isId(seg) || seg.startsWith('[')) break
    parts.push(seg)
  }
  const p = '/' + parts.join('/')
  if (p.length > 200 || SKIP.some(r => r.test(p))) return null
  return p
}

const human = (seg: string) => seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

/** "Grocery · End of Day", "Supplier Payments · Request", "Receipts" */
export function shortcutLabel(path: string): string {
  const parts = path.split('/').filter(Boolean)
  const name = pageName(path)
  if (parts.length < 2 || parts[0] === 'universal') return name
  return `${human(parts[0])} · ${name}`
}

export interface ShortcutRow {
  path: string
  label: string
  visitCount: number
  lastVisitedAt: string | Date
  pinned: boolean
  hidden: boolean
}

/** Pinned first, then by use, recent use weighing more; hidden ones left out */
export function pickShortcuts(rows: ShortcutRow[], max = 6, now = Date.now()): ShortcutRow[] {
  const score = (r: ShortcutRow) => {
    const days = (now - new Date(r.lastVisitedAt).getTime()) / 86_400_000
    return r.visitCount / (1 + days / 7)
  }
  return rows
    .filter(r => !r.hidden && (r.pinned || ((now - new Date(r.lastVisitedAt).getTime()) / 86_400_000 <= 60 && r.visitCount >= 2)))
    .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || score(b) - score(a))
    .slice(0, max)
}
