'use client'

import { useEffect, useState, useCallback } from 'react'
import { ModalPortal } from '@/components/ui/modal-portal'

/**
 * MBM-288 §5.2 — the expanded view opened by tapping the compact POS widget.
 * Daily/weekly/monthly progress, comparisons to the equivalent prior period,
 * and a 14-day achievement chart for every viewer with
 * `canViewBusinessTargetProgress`. The commitment breakdown, calculation
 * assumptions, and change-history panel only render when the API actually
 * returned them (admin tier) — the same "response shape enforces the
 * permission tier" pattern as `/api/business-targets/[businessId]` itself,
 * not a client-side hide.
 */

interface Progress {
  target: number
  actual: number
  remaining: number
  percentAchieved: number
}

interface Comparison {
  actual: number
  previousActual: number
  deltaPct: number | null
}

interface ChartDay {
  date: string
  target: number
  actual: number
}

interface Breakdown {
  rentMonthly: number
  payrollMonthly: number
  recurringCommitmentsMonthly: number
  loanRepaymentMonthly: number
  otherCommitmentsMonthly: number
  buffer: number
  minimumRequiredMonthlyTarget: number
  tradingDaysInMonth: number
}

interface Commitment {
  id: string
  category: 'LOAN_REPAYMENT' | 'OTHER'
  label: string
  monthlyAmount: number
}

interface Assumptions {
  isNewBusinessEstimate?: boolean
  baselineAvgMonthlySales?: number | null
  seasonalAdjustmentFactor?: number
  growthTrendFactor?: number
  achievementAdjustmentFactor?: number
}

interface ExpandedData {
  isEnabled: boolean
  daily?: Progress & { status: 'AHEAD' | 'ON_TRACK' | 'WATCH' | 'BEHIND' }
  weekly?: Progress
  monthly?: Progress
  comparisons?: {
    todayVsYesterday: Comparison
    weekVsLastWeek: Comparison
    monthVsLastMonth: Comparison
  }
  chart?: ChartDay[]
  breakdown?: Breakdown
  commitments?: Commitment[]
  assumptions?: Assumptions | null
}

interface HistoryRow {
  id: string
  changeType: string
  previousValue: number | null
  newValue: number | null
  reason: string | null
  changedAt: string
  changer: { name: string | null } | null
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const STATUS_STYLE: Record<string, { label: string; icon: string; text: string }> = {
  AHEAD: { label: 'Ahead', icon: '🚀', text: 'text-green-600 dark:text-green-400' },
  ON_TRACK: { label: 'On Track', icon: '✅', text: 'text-blue-600 dark:text-blue-400' },
  WATCH: { label: 'Watch', icon: '⚠️', text: 'text-amber-600 dark:text-amber-400' },
  BEHIND: { label: 'Behind', icon: '🔻', text: 'text-red-600 dark:text-red-400' },
}

function DeltaBadge({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null) return <span className="text-secondary text-xs">—</span>
  const up = deltaPct >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {up ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(1)}%
    </span>
  )
}

function ProgressCard({ label, data }: { label: string; data?: Progress }) {
  if (!data) return null
  const pct = Math.min(100, data.percentAchieved)
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className="text-[11px] text-secondary uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-primary mt-0.5">{fmt(data.actual)} / {fmt(data.target)}</p>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-secondary mt-1">{data.percentAchieved}% • {fmt(data.remaining)} to go</p>
    </div>
  )
}

function ComparisonRow({ label, comparison }: { label: string; comparison?: Comparison }) {
  if (!comparison) return null
  return (
    <div className="flex items-center justify-between py-1.5 text-sm border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-primary">{fmt(comparison.actual)}</span>
        <DeltaBadge deltaPct={comparison.deltaPct} />
      </div>
    </div>
  )
}

function Chart({ days }: { days: ChartDay[] }) {
  return (
    <div className="flex items-end gap-1 h-20 overflow-x-auto">
      {days.map((d) => {
        const pct = d.target > 0 ? Math.min(100, Math.round((d.actual / d.target) * 100)) : 0
        const color = pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
        const weekday = new Date(`${d.date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' })
        return (
          <div key={d.date} className="flex flex-col items-center justify-end h-full flex-1 min-w-[14px]" title={`${d.date}: ${fmt(d.actual)} / ${fmt(d.target)} (${pct}%)`}>
            <div className={`w-full rounded-t ${color}`} style={{ height: `${Math.max(2, pct * 0.6)}px` }} />
            <span className="text-[9px] text-secondary mt-1">{weekday}</span>
          </div>
        )
      })}
    </div>
  )
}

export function TargetExpandedModal({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const [data, setData] = useState<ExpandedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetch(`/api/business-targets/${businessId}/expanded?timezone=${encodeURIComponent(timezone)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (!cancelled) setData(json?.data ?? null) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [businessId])

  const loadHistory = useCallback(async () => {
    if (history) { setHistoryOpen((v) => !v); return }
    try {
      const res = await fetch(`/api/business-targets/${businessId}/history?limit=10`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setHistory(json.data ?? [])
        setHistoryOpen(true)
      }
    } catch {
      /* silent — history panel is a bonus, not core to the view */
    }
  }, [businessId, history])

  const isAdmin = !!data?.breakdown

  // Portal straight to <body> (same helper other modals in this app already
  // use, e.g. cash-box-history-modal.tsx) — this opens from deep inside POS
  // pages that have their own transformed/sticky/scrolling ancestors, any of
  // which can silently hijack a `position: fixed` descendant's containing
  // block (a well-known CSS trap: `transform`/`filter`/`will-change` on an
  // ancestor makes `fixed` children position relative to THAT ancestor, not
  // the viewport). That's what caused the header to scroll away with no way
  // back — the modal wasn't actually fixed to the screen.
  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg md:max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-primary">🎯 Sales Target Progress</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg">✕</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-secondary">Loading...</div>
        ) : !data || !data.isEnabled ? (
          <div className="p-8 text-center text-secondary text-sm">Target tracking isn't enabled for this business.</div>
        ) : (
          <div className="p-5 space-y-4 overflow-y-auto min-h-0">
            {data.daily && (
              <div className={`flex items-center gap-2 text-sm font-semibold ${STATUS_STYLE[data.daily.status].text}`}>
                <span aria-hidden>{STATUS_STYLE[data.daily.status].icon}</span> {STATUS_STYLE[data.daily.status].label} for today
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <ProgressCard label="Today" data={data.daily} />
              <ProgressCard label="This Week" data={data.weekly} />
              <ProgressCard label="This Month" data={data.monthly} />
            </div>

            {data.comparisons && (
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md">
                <p className="text-xs font-medium text-secondary mb-1">Compared to the equivalent prior period</p>
                <ComparisonRow label="Today vs. yesterday" comparison={data.comparisons.todayVsYesterday} />
                <ComparisonRow label="This week vs. last week" comparison={data.comparisons.weekVsLastWeek} />
                <ComparisonRow label="This month vs. last month" comparison={data.comparisons.monthVsLastMonth} />
              </div>
            )}

            {data.chart && data.chart.length > 0 && (
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md">
                <p className="text-xs font-medium text-secondary mb-2">Last 14 days</p>
                <Chart days={data.chart} />
              </div>
            )}

            {isAdmin && data.breakdown && (
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md text-xs space-y-1">
                <p className="font-medium text-secondary mb-1">Minimum target breakdown</p>
                <div className="flex justify-between"><span className="text-secondary">🏠 Rent</span><span className="text-primary">{fmt(data.breakdown.rentMonthly)}</span></div>
                <div className="flex justify-between"><span className="text-secondary">👥 Payroll</span><span className="text-primary">{fmt(data.breakdown.payrollMonthly)}</span></div>
                <div className="flex justify-between"><span className="text-secondary">🔁 Recurring commitments</span><span className="text-primary">{fmt(data.breakdown.recurringCommitmentsMonthly)}</span></div>
                <div className="flex justify-between"><span className="text-secondary">🏦 Loan repayments</span><span className="text-primary">{fmt(data.breakdown.loanRepaymentMonthly)}</span></div>
                <div className="flex justify-between"><span className="text-secondary">➕ Other commitments</span><span className="text-primary">{fmt(data.breakdown.otherCommitmentsMonthly)}</span></div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1"><span className="text-secondary">🛡️ Buffer</span><span className="text-primary">{fmt(data.breakdown.buffer)}</span></div>
              </div>
            )}

            {isAdmin && data.assumptions && (
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md text-xs space-y-1">
                <p className="font-medium text-secondary mb-1">Recommendation assumptions</p>
                {data.assumptions.isNewBusinessEstimate ? (
                  <p className="text-secondary">Estimated — not enough sales history yet for a data-driven recommendation (minimum × 1.15).</p>
                ) : (
                  <>
                    <div className="flex justify-between"><span className="text-secondary">Baseline avg. monthly sales</span><span className="text-primary">{data.assumptions.baselineAvgMonthlySales != null ? fmt(data.assumptions.baselineAvgMonthlySales) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-secondary">Seasonal adjustment</span><span className="text-primary">{(data.assumptions.seasonalAdjustmentFactor ?? 1).toFixed(2)}×</span></div>
                    <div className="flex justify-between"><span className="text-secondary">Growth trend</span><span className="text-primary">{(data.assumptions.growthTrendFactor ?? 1).toFixed(2)}×</span></div>
                    <div className="flex justify-between"><span className="text-secondary">Achievement adjustment</span><span className="text-primary">{(data.assumptions.achievementAdjustmentFactor ?? 1).toFixed(2)}×</span></div>
                  </>
                )}
              </div>
            )}

            {isAdmin && data.commitments && data.commitments.length > 0 && (
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md text-xs space-y-1">
                <p className="font-medium text-secondary mb-1">Manual commitments</p>
                {data.commitments.map((c) => (
                  <div key={c.id} className="flex justify-between">
                    <span className="text-secondary">{c.category === 'LOAN_REPAYMENT' ? '🏦' : '➕'} {c.label}</span>
                    <span className="text-primary">{fmt(c.monthlyAmount)}/mo</span>
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={loadHistory} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  {historyOpen ? '▲ Hide change history' : '▼ View change history'}
                </button>
                {historyOpen && history && (
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                    {history.length === 0 && <p className="text-xs text-secondary">No changes recorded yet.</p>}
                    {history.map((h) => (
                      <div key={h.id} className="text-xs border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <div className="flex justify-between">
                          <span className="text-primary font-medium">{h.changeType.replace(/_/g, ' ')}</span>
                          <span className="text-secondary">{new Date(h.changedAt).toLocaleDateString()}</span>
                        </div>
                        {(h.previousValue !== null || h.newValue !== null) && (
                          <p className="text-secondary">{h.previousValue !== null ? fmt(h.previousValue) : '—'} → {h.newValue !== null ? fmt(h.newValue) : '—'}</p>
                        )}
                        {h.reason && <p className="text-secondary italic">"{h.reason}"</p>}
                        <p className="text-secondary">{h.changer?.name || 'System'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3 shrink-0">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}
