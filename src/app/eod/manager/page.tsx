'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

// ── Types ─────────────────────────────────────────────────────────────────────

interface EodRecord {
  id: string
  salespersonId: string
  reportDate: string
  cashAmount: number
  ecocashAmount: number
  notes: string | null
  status: string
  submittedAt: string | null
  isManagerOverride: boolean
  overrideReason: string | null
  salesperson: { id: string; name: string; email: string }
  submittedBy: { id: string; name: string } | null
}

interface Totals { cashTotal: number; ecocashTotal: number }
interface Counts { total: number; pending: number; submitted: number; overridden: number }

type Tab = 'status' | 'overrides'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return `$${Number(n).toFixed(2)}` }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status, deadlinePassed }: { status: string; deadlinePassed: boolean }) {
  if (status === 'SUBMITTED') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">✓ Submitted</span>
  )
  if (status === 'OVERRIDDEN') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">Overridden</span>
  )
  // PENDING
  if (deadlinePassed) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">⚠ Overdue</span>
  )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Pending</span>
  )
}

// ── Override modal ────────────────────────────────────────────────────────────

interface OverrideModalProps {
  record: EodRecord
  businessId: string
  onClose: () => void
  onSuccess: () => void
}

function OverrideModal({ record, businessId, onClose, onSuccess }: OverrideModalProps) {
  const [cash, setCash] = useState('')
  const [ecocash, setEcocash] = useState('')
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) { setError('Override reason is required'); return }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/eod/salesperson/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          salespersonId: record.salespersonId,
          reportDate: record.reportDate,
          cashAmount: parseFloat(cash) || 0,
          ecocashAmount: parseFloat(ecocash) || 0,
          notes: notes.trim() || undefined,
          overrideReason: reason.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to submit'); return }
      setDone(true)
      setTimeout(() => { onSuccess(); onClose() }, 1200)
    } catch { setError('Network error — please try again') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-neutral-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">Submit on Behalf</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{record.salesperson.name} · {fmtDate(record.reportDate)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">✕</button>
        </div>

        {done ? (
          <div className="px-5 py-10 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">EOD submitted successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cash Collected <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={cash} onChange={e => setCash(e.target.value)} required
                    className="w-full pl-6 pr-2 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">EcoCash Collected <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={ecocash} onChange={e => setEcocash(e.target.value)} required
                    className="w-full pl-6 pr-2 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea rows={2} placeholder="Any relevant comments..." value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Override Reason <span className="text-red-500">*</span></label>
              <textarea rows={2} placeholder="Why are you submitting on behalf of this salesperson?" value={reason} onChange={e => setReason(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-primary focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none" />
            </div>

            {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors">
                {submitting ? 'Submitting…' : 'Submit Override'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ManagerEodPage() {
  const { currentBusiness, currentBusinessId, hasPermission, isSystemAdmin, loading: bizLoading } = useBusinessPermissionsContext()

  const [tab, setTab] = useState<Tab>('status')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState<EodRecord[]>([])
  const [totals, setTotals] = useState<Totals>({ cashTotal: 0, ecocashTotal: 0 })
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, submitted: 0, overridden: 0 })
  const [loading, setLoading] = useState(false)

  const [overrides, setOverrides] = useState<EodRecord[]>([])
  const [overridesLoading, setOverridesLoading] = useState(false)
  const [overrideFromDate, setOverrideFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]
  })
  const [overrideToDate, setOverrideToDate] = useState(() => new Date().toISOString().split('T')[0])

  const [overrideModal, setOverrideModal] = useState<EodRecord | null>(null)

  const canAccess = isSystemAdmin || hasPermission('canCloseBooks')

  // Deadline passed check — past dates are always overdue; today checks against configured deadline time
  const deadlinePassed = (() => {
    const today = new Date().toISOString().split('T')[0]
    if (selectedDate < today) return true
    const t = currentBusiness?.eodDeadlineTime
    if (!t) return false
    const [h, m] = t.split(':').map(Number)
    const now = new Date()
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)
  })()

  const fetchRecords = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/eod/salesperson/all?businessId=${currentBusinessId}&date=${selectedDate}`)
      const json = await res.json()
      if (json.success) {
        setRecords(json.data)
        setTotals(json.totals)
        setCounts(json.counts)
      }
    } finally { setLoading(false) }
  }, [currentBusinessId, selectedDate])

  const fetchOverrides = useCallback(async () => {
    if (!currentBusinessId) return
    setOverridesLoading(true)
    try {
      const res = await fetch(`/api/eod/overrides?businessId=${currentBusinessId}&from=${overrideFromDate}&to=${overrideToDate}`)
      const json = await res.json()
      if (json.success) setOverrides(json.data)
    } finally { setOverridesLoading(false) }
  }, [currentBusinessId, overrideFromDate, overrideToDate])

  useEffect(() => { if (tab === 'status') fetchRecords() }, [fetchRecords, tab])
  useEffect(() => { if (tab === 'overrides') fetchOverrides() }, [fetchOverrides, tab])

  if (bizLoading) return (
    <MainLayout><ContentLayout title="Staff EOD Status"><div className="text-sm text-gray-500 py-8 text-center">Loading…</div></ContentLayout></MainLayout>
  )

  if (!canAccess) return (
    <MainLayout><ContentLayout title="Staff EOD Status">
      <div className="text-sm text-red-600 py-8 text-center">You do not have permission to view this page.</div>
    </ContentLayout></MainLayout>
  )

  if (!currentBusiness?.requireSalespersonEod) return (
    <MainLayout><ContentLayout title="Staff EOD Status">
      <div className="text-sm text-gray-500 py-8 text-center">Salesperson EOD reporting is not enabled for this business.</div>
    </ContentLayout></MainLayout>
  )

  return (
    <MainLayout>
      <ContentLayout
        title="Staff EOD Status"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Staff EOD Status', isActive: true },
        ]}
      >
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-neutral-700">
          {(['status', 'overrides'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {t === 'status' ? "Today's Status" : 'Override Log'}
            </button>
          ))}
        </div>

        {/* ── TODAY'S STATUS TAB ── */}
        {tab === 'status' && (
          <div className="space-y-5">
            {/* Date picker + summary counts */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Date:</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-primary" />
              </div>
              <div className="flex gap-3 ml-auto text-xs">
                <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">{counts.pending} pending</span>
                <span className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-medium">{counts.submitted} submitted</span>
                <span className="px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-medium">{counts.overridden} overridden</span>
              </div>
            </div>

            {loading ? (
              <div className="text-sm text-gray-500 py-8 text-center">Loading…</div>
            ) : records.length === 0 ? (
              <div className="text-sm text-gray-500 py-8 text-center">No salesperson EOD records for this date.</div>
            ) : (
              <>
                {/* Records table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-neutral-800/60 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">Salesperson</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Cash</th>
                        <th className="px-4 py-3 text-right">EcoCash</th>
                        <th className="px-4 py-3 text-left">Submitted</th>
                        <th className="px-4 py-3 text-left">Notes</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-700">
                      {records.map(r => (
                        <tr key={r.id} className="bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-750">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-neutral-100">{r.salesperson.name}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={r.status} deadlinePassed={deadlinePassed} />
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{r.status !== 'PENDING' ? fmt(r.cashAmount) : '—'}</td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{r.status !== 'PENDING' ? fmt(r.ecocashAmount) : '—'}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                            {r.submittedAt ? fmtTime(r.submittedAt) : '—'}
                            {r.isManagerOverride && r.submittedBy && (
                              <span className="block text-orange-500 dark:text-orange-400">by {r.submittedBy.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[180px] truncate">{r.notes ?? '—'}</td>
                          <td className="px-4 py-3 text-right">
                            {r.status === 'PENDING' && (
                              <button onClick={() => setOverrideModal(r)}
                                className="text-xs font-medium px-2.5 py-1 rounded-md bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors">
                                Submit on behalf
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals row */}
                    {counts.submitted + counts.overridden > 0 && (
                      <tfoot className="bg-gray-50 dark:bg-neutral-800/60 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <tr>
                          <td className="px-4 py-3" colSpan={2}>Totals (submitted)</td>
                          <td className="px-4 py-3 text-right">{fmt(totals.cashTotal)}</td>
                          <td className="px-4 py-3 text-right">{fmt(totals.ecocashTotal)}</td>
                          <td colSpan={3} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* All pending warning */}
                {counts.pending > 0 && (
                  <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                    ⚠ {counts.pending} salesperson{counts.pending > 1 ? 's have' : ' has'} not submitted their EOD report.
                    The manager EOD cannot be closed until all reports are submitted.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── OVERRIDE LOG TAB ── */}
        {tab === 'overrides' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">From:</label>
                <input type="date" value={overrideFromDate} onChange={e => setOverrideFromDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">To:</label>
                <input type="date" value={overrideToDate} onChange={e => setOverrideToDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-primary" />
              </div>
              <button onClick={fetchOverrides}
                className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Search
              </button>
            </div>

            {overridesLoading ? (
              <div className="text-sm text-gray-500 py-8 text-center">Loading…</div>
            ) : overrides.length === 0 ? (
              <div className="text-sm text-gray-500 py-8 text-center">No override records found for this period.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-neutral-800/60 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Salesperson</th>
                      <th className="px-4 py-3 text-left">Overridden By</th>
                      <th className="px-4 py-3 text-right">Cash</th>
                      <th className="px-4 py-3 text-right">EcoCash</th>
                      <th className="px-4 py-3 text-left">Override Reason</th>
                      <th className="px-4 py-3 text-left">Override Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-neutral-700">
                    {overrides.map(r => (
                      <tr key={r.id} className="bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-750">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtDate(r.reportDate)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-neutral-100">{r.salesperson.name}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.submittedBy?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(r.cashAmount)}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(r.ecocashAmount)}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[200px]">{r.overrideReason ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{fmtTime(r.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </ContentLayout>

      {/* Override modal */}
      {overrideModal && currentBusinessId && (
        <OverrideModal
          record={overrideModal}
          businessId={currentBusinessId}
          onClose={() => setOverrideModal(null)}
          onSuccess={fetchRecords}
        />
      )}
    </MainLayout>
  )
}
