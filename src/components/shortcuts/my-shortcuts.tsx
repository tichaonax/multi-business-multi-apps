'use client'

// MBM-360: "My shortcuts" — each user's most used pages, learned from what
// they open (stored with their login, so they follow them to any
// workstation). Pinned ones first; each can be pinned or hidden. Until there
// is history, a starting set from the user's permissions.
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { shortcutPath, shortcutLabel } from '@/lib/shortcuts/page-shortcuts'

export interface Shortcut { path: string; label: string; pinned?: boolean; starter?: boolean }

const CHANGED = 'shortcuts:changed'
const REPORT_TYPES = ['clothing', 'grocery', 'hardware', 'restaurant']

async function save(path: string, change: { pinned?: boolean; hidden?: boolean }) {
  await fetch('/api/user/shortcuts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, ...change }) })
  window.dispatchEvent(new Event(CHANGED))
}

/** The user's shortcuts (or the starting set), kept fresh across the page */
export function useMyShortcuts() {
  const { currentBusiness, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const [learned, setLearned] = useState<Shortcut[] | null>(null)
  const [hidden, setHidden] = useState<Shortcut[]>([])
  const [pinnedPaths, setPinnedPaths] = useState<string[]>([])

  const load = useCallback(() => {
    fetch('/api/user/shortcuts')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!j) return
        setLearned((j.shortcuts || []).map((s: any) => ({ path: s.path, label: s.label, pinned: s.pinned })))
        setHidden(j.hidden || [])
        setPinnedPaths(j.pinnedPaths || [])
      })
      .catch(() => { /* offline: keep what we have */ })
  }, [])
  useEffect(() => {
    load()
    window.addEventListener(CHANGED, load)
    return () => window.removeEventListener(CHANGED, load)
  }, [load])

  // The starting set, until the user has history
  const type = (currentBusiness?.businessType || '').replace(/_/g, '-')
  const canReports = isSystemAdmin || hasPermission('canViewWifiReports') || hasPermission('canAccessFinancialData')
  const starters: Shortcut[] = [
    ...(type ? [{ path: `/${type}/pos`, label: 'POS' }] : []),
    { path: '/universal/receipts', label: 'Receipts' },
    ...(canReports && REPORT_TYPES.includes(type) ? [{ path: `/${type}/reports/end-of-day`, label: 'End of Day' }] : []),
    ...(hasPermission('canSubmitSupplierPaymentRequests') ? [{ path: '/supplier-payments/request', label: 'Supplier payment request' }] : []),
    ...(hasPermission('canViewExpenseReports') ? [{ path: '/expense-accounts', label: 'Expense accounts' }] : []),
  ]
    .filter(s => !hidden.some(h => h.path === s.path))
    .map(s => ({ ...s, starter: true }))

  // learned ones first, topped up with the starting set (up to 6)
  const mine = learned || []
  const shortcuts = [...mine, ...starters.filter(s => !mine.some(m => m.path === s.path))].slice(0, Math.max(6, mine.length))
  return { shortcuts, hidden, pinnedPaths, learnedCount: learned?.length ?? 0, loaded: learned !== null }
}

/** ⭐ My shortcuts — the header button and its list */
export function MyShortcutsMenu() {
  const pathname = usePathname() || ''
  const { shortcuts, hidden, pinnedPaths, learnedCount } = useMyShortcuts()
  const [open, setOpen] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  useEffect(() => { setOpen(false) }, [pathname])

  const here = shortcutPath(pathname)
  const herePinned = !!here && pinnedPaths.includes(here)

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} title="My shortcuts"
        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
        <span className="text-amber-500">⭐</span>
        <span className="hidden xl:inline">My shortcuts</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-[60] py-2">
          <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            My shortcuts
          </div>
          {learnedCount === 0 && (
            <p className="px-3 pb-1 text-xs text-gray-500 dark:text-gray-400">The pages you use most will show here, first.</p>
          )}
          <ul>
            {shortcuts.map(s => (
              <li key={s.path} className="group flex items-center gap-1 px-1">
                <Link href={s.path} className={`flex-1 min-w-0 truncate px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${s.path === here ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {s.pinned && <span className="mr-1">📌</span>}{s.label}
                </Link>
                {!s.starter && (
                  <button type="button" title={s.pinned ? 'Unpin' : 'Pin to the top'} onClick={() => save(s.path, { pinned: !s.pinned })}
                    className="px-1.5 py-1 rounded text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                    {s.pinned ? 'Unpin' : '📌'}
                  </button>
                )}
                <button type="button" title="Hide this shortcut" onClick={() => save(s.path, { hidden: true })}
                  className="px-1.5 py-1 rounded text-xs text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
              </li>
            ))}
          </ul>
          <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700 px-1">
            {here && !herePinned && (
              <button type="button" onClick={() => save(here, { pinned: true })}
                className="w-full text-left px-2 py-1.5 rounded text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                📌 Pin this page ({shortcutLabel(here)})
              </button>
            )}
            {hidden.length > 0 && (
              <button type="button" onClick={() => setShowHidden(v => !v)}
                className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                {showHidden ? '▾' : '▸'} Hidden ({hidden.length})
              </button>
            )}
            {showHidden && hidden.map(h => (
              <div key={h.path} className="flex items-center gap-1 pl-5 pr-1">
                <span className="flex-1 min-w-0 truncate text-xs text-gray-500 dark:text-gray-400">{h.label}</span>
                <button type="button" onClick={() => save(h.path, { hidden: false })}
                  className="px-1.5 py-0.5 rounded text-xs text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700">Show</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
