'use client'

import { useEffect, useState } from 'react'
import { TargetExpandedModal } from './target-expanded-modal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

/**
 * MBM-288 §5.1 — the POS compact target-progress widget. Renders nothing
 * when target tracking isn't enabled for the business, the user lacks
 * `canViewBusinessTargetProgress`, or the endpoint fails — silent no-op,
 * same pattern the Dashboard's Cash Position card already uses for a
 * missing-permission 403. Deliberately shows only sales figures the operator
 * needs at the till — no commitment/buffer breakdown (that's admin-tier,
 * see the expanded view).
 *
 * Follow-up (2026-09-02): the click-to-expand drill-down is admin/manager
 * only (`canManageBusinessTargets`) — a regular salesperson still sees the
 * compact progress bar (it's motivating and harmless), but can't open the
 * comparisons/chart view. This is stricter than §5.2's original two-tier
 * design (which gave every `canViewBusinessTargetProgress` holder the
 * comparisons/chart, reserving only the cost breakdown for managers) — the
 * user asked for the whole drill-down to be manager-and-up only.
 */

interface TodayTargetData {
  isEnabled: boolean
  dailyTarget?: number
  actualToday?: number
  remainingToday?: number
  percentAchieved?: number
  status?: 'AHEAD' | 'ON_TRACK' | 'WATCH' | 'BEHIND'
}

const STATUS_STYLE: Record<string, { label: string; icon: string; bar: string; bg: string; text: string }> = {
  AHEAD: { label: 'Ahead', icon: '🚀', bar: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300' },
  ON_TRACK: { label: 'On Track', icon: '✅', bar: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
  WATCH: { label: 'Watch', icon: '⚠️', bar: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300' },
  BEHIND: { label: 'Behind', icon: '🔻', bar: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300' },
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

export function TargetProgressWidget({ businessId }: { businessId: string }) {
  const [data, setData] = useState<TodayTargetData | null>(null)
  const [expanded, setExpanded] = useState(false)
  const { hasPermissionInBusiness } = useBusinessPermissionsContext()
  const canViewDetails = hasPermissionInBusiness('canManageBusinessTargets', businessId)

  useEffect(() => {
    if (!businessId) return
    let cancelled = false
    const load = () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      fetch(`/api/business-targets/${businessId}/today?timezone=${encodeURIComponent(timezone)}`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => { if (!cancelled) setData(json?.data ?? null) })
        .catch(() => { if (!cancelled) setData(null) })
    }
    load()
    // Same 60s cadence as the Dashboard's own stats refresh — frequent
    // enough to feel live at the till without hammering the endpoint.
    const interval = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [businessId])

  if (!data || !data.isEnabled) return null

  const style = STATUS_STYLE[data.status || 'ON_TRACK']
  const pct = Math.min(100, data.percentAchieved ?? 0)
  const containerCls = `rounded-lg border px-3 py-2 text-xs w-full text-left ${style.bg} ${canViewDetails ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`

  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className={`font-semibold flex items-center gap-1 ${style.text}`}>
          <span aria-hidden>{style.icon}</span> {style.label}
        </span>
        <span className="text-gray-600 dark:text-gray-400 font-medium">
          {fmt(data.actualToday ?? 0)} / {fmt(data.dailyTarget ?? 0)} ({pct}%)
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full ${style.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {(data.remainingToday ?? 0) > 0 && (
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{fmt(data.remainingToday!)} to go today</p>
      )}
    </>
  )

  return (
    <>
      {canViewDetails ? (
        <button type="button" onClick={() => setExpanded(true)} className={containerCls} title="Today's sales target — click for details">
          {body}
        </button>
      ) : (
        <div className={containerCls}>{body}</div>
      )}
      {canViewDetails && expanded && <TargetExpandedModal businessId={businessId} onClose={() => setExpanded(false)} />}
    </>
  )
}
