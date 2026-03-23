'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface Business { id: string; name: string; type: string }

interface BucketBalance {
  businessId: string
  business: Business | null
  inflow: number
  outflow: number
  balance: number
}

interface BucketEntry {
  id: string
  businessId: string
  business: Business | null
  entryType: string
  direction: string
  amount: number
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  paymentChannel: string
  entryDate: string
  createdBy: { id: string; name: string } | null
  editedAt: string | null
  editedBy: { id: string; name: string } | null
  deletedAt: string | null
  deletedBy: { id: string; name: string } | null
  deletionReason: string | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const ENTRY_TYPE_LABEL: Record<string, string> = {
  EOD_RECEIPT:      '💵 EOD Receipt',
  PAYMENT_APPROVAL: '✅ Payment Approval',
  PETTY_CASH:       '🪙 Petty Cash',
  CASH_ALLOCATION:  '📋 Cash Allocation',
}

const localToday = () => new Date().toISOString().split('T')[0]
const local30DaysAgo = () => {
  const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().split('T')[0]
}

export default function CashBucketReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [balances, setBalances] = useState<BucketBalance[]>([])
  const [entries, setEntries] = useState<BucketEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [bizFilter, setBizFilter] = useState('')
  const [dirFilter, setDirFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [startDate, setStartDate] = useState(local30DaysAgo)
  const [endDate, setEndDate] = useState(localToday)
  const [showEdited, setShowEdited] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [offset, setOffset] = useState(0)
  const limit = 100
  const [selectedEntry, setSelectedEntry] = useState<BucketEntry | null>(null)
  const [entryDetail, setEntryDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const buildUrl = useCallback(() => {
    const p = new URLSearchParams()
    if (bizFilter)  p.set('businessId', bizFilter)
    if (dirFilter)  p.set('direction', dirFilter)
    if (typeFilter) p.set('entryType', typeFilter)
    if (startDate)  p.set('startDate', startDate)
    if (endDate)    p.set('endDate', endDate)
    p.set('limit', String(limit))
    p.set('offset', String(offset))
    return `/api/cash-bucket?${p.toString()}`
  }, [bizFilter, dirFilter, typeFilter, startDate, endDate, offset])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(buildUrl(), { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setTotalBalance(json.data.totalBalance)
      setBalances(json.data.balances)
      setEntries(json.data.entries)
      setTotal(json.data.pagination.total)
    } finally {
      setLoading(false)
    }
  }, [buildUrl])

  const loadBusinesses = useCallback(async () => {
    const res = await fetch('/api/admin/businesses', { credentials: 'include' })
    if (res.ok) {
      const json = await res.json()
      setBusinesses(Array.isArray(json) ? json : (json.data ?? []))
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/signin'); return }
    if (status === 'authenticated') { load(); loadBusinesses() }
  }, [status, load, loadBusinesses, router])

  const applyFilters = () => { setOffset(0); load() }

  const totalInflow  = balances.filter(b => !bizFilter || b.businessId === bizFilter).reduce((s, b) => s + b.inflow, 0)
  const totalOutflow = balances.filter(b => !bizFilter || b.businessId === bizFilter).reduce((s, b) => s + b.outflow, 0)

  const editedEntries  = entries.filter(e => !!e.editedAt)
  const deletedEntries = entries.filter(e => !!e.deletedAt)

  // Build per-user audit breakdown
  const auditByUser = new Map<string, { name: string; edits: number; deletes: number }>()
  for (const e of editedEntries) {
    if (!e.editedBy) continue
    const cur = auditByUser.get(e.editedBy.id) ?? { name: e.editedBy.name, edits: 0, deletes: 0 }
    cur.edits++
    auditByUser.set(e.editedBy.id, cur)
  }
  for (const e of deletedEntries) {
    if (!e.deletedBy) continue
    const cur = auditByUser.get(e.deletedBy.id) ?? { name: e.deletedBy.name, edits: 0, deletes: 0 }
    cur.deletes++
    auditByUser.set(e.deletedBy.id, cur)
  }
  const auditUsers = [...auditByUser.values()].sort((a, b) => (b.edits + b.deletes) - (a.edits + a.deletes))

  // Apply client-side audit filters
  const displayedEntries = entries.filter(e => {
    if (showEdited && !e.editedAt) return false
    if (showDeleted && !e.deletedAt) return false
    return true
  })

  return (
    <ContentLayout
      title="🪣 Cash Bucket Report"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Cash Bucket', href: '/cash-bucket' },
        { label: 'Report', isActive: true },
      ]}
    >
      <div className="space-y-6 print:space-y-4">

        {/* Print header (hidden on screen) */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Cash Bucket Report</h1>
          <p className="text-sm text-gray-500">
            {startDate} — {endDate}
            {bizFilter && ` · ${businesses.find(b => b.id === bizFilter)?.name}`}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Total Cash in Bucket</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{fmt(totalBalance)}</p>
          </div>
          <div className="rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total Inflows</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">{fmt(totalInflow)}</p>
          </div>
          <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3">
            <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Total Outflows</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-0.5">{fmt(totalOutflow)}</p>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Edits</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{editedEntries.length}</p>
          </div>
          <div className="rounded-lg border border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 px-4 py-3">
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wide">Deletions</p>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-0.5">{deletedEntries.length}</p>
          </div>
        </div>

        {/* Audit activity breakdown (only shown when there are edits/deletions) */}
        {auditUsers.length > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 p-4 print:break-inside-avoid">
            <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3">Audit Activity</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {auditUsers.map(u => (
                <div key={u.name} className="text-xs bg-white dark:bg-gray-800 rounded border border-amber-200 dark:border-amber-700 px-2 py-1.5">
                  <span className="font-medium text-primary">{u.name}</span>
                  <div className="mt-0.5 text-secondary flex gap-2">
                    {u.edits > 0 && <span>✏️ {u.edits} edit{u.edits !== 1 ? 's' : ''}</span>}
                    {u.deletes > 0 && <span>🗑️ {u.deletes} del</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-business breakdown */}
        <div className="print:break-inside-avoid">
          <h2 className="text-sm font-semibold text-primary mb-2">Per-Business Balance</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-secondary uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Business</th>
                  <th className="px-3 py-2 text-right">Inflow</th>
                  <th className="px-3 py-2 text-right">Outflow</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {balances.filter(b => !bizFilter || b.businessId === bizFilter).map(b => (
                  <tr key={b.businessId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-3 py-2 font-medium text-primary">{b.business?.name ?? b.businessId}</td>
                    <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">{fmt(b.inflow)}</td>
                    <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">{fmt(b.outflow)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${b.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {fmt(b.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Filters */}
        <div className="print:hidden rounded-lg border border-border bg-card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Business</label>
              <SearchableSelect
                options={businesses.map(b => ({ value: b.id, label: b.name }))}
                value={bizFilter}
                onChange={setBizFilter}
                placeholder="Search business…"
                allLabel="All businesses"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Direction</label>
              <select value={dirFilter} onChange={e => setDirFilter(e.target.value)}
                className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background text-primary">
                <option value="">All</option>
                <option value="INFLOW">Inflow</option>
                <option value="OUTFLOW">Outflow</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Type</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background text-primary">
                <option value="">All</option>
                <option value="EOD_RECEIPT">EOD Receipt</option>
                <option value="PAYMENT_APPROVAL">Payment Approval</option>
                <option value="PETTY_CASH">Petty Cash</option>
                <option value="CASH_ALLOCATION">Cash Allocation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background text-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background text-primary" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={applyFilters}
                className="flex-1 py-1.5 px-3 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                Apply
              </button>
              <button onClick={() => window.print()}
                className="py-1.5 px-3 border border-border text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                🖨
              </button>
            </div>
          </div>
          <div className="flex gap-4 mt-2 pt-2 border-t border-border">
            <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
              <input type="checkbox" checked={showEdited} onChange={e => setShowEdited(e.target.checked)} className="rounded" />
              ✏️ Show only edited
            </label>
            <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
              <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded" />
              🗑️ Show only deleted
            </label>
          </div>
        </div>

        {/* Ledger */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-primary">
              Ledger {total > 0 && <span className="text-secondary font-normal">({displayedEntries.length}{displayedEntries.length !== total ? ` of ${total}` : ''} entries)</span>}
            </h2>
          </div>

          {loading ? (
            <p className="text-sm text-secondary">Loading…</p>
          ) : displayedEntries.length === 0 ? (
            <div className="rounded-lg border border-border p-8 text-center">
              <p className="text-sm text-secondary">No entries match the selected filters.</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-secondary uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Business</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Notes</th>
                      <th className="px-3 py-2 text-right">Inflow</th>
                      <th className="px-3 py-2 text-right">Outflow</th>
                      <th className="px-3 py-2 text-left print:hidden">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayedEntries.map(e => {
                      const isDeleted = !!e.deletedAt
                      const isEdited = !!e.editedAt && !isDeleted
                      return (
                        <tr key={e.id} onClick={async () => {
                          setSelectedEntry(e)
                          setEntryDetail(null)
                          setDetailLoading(true)
                          try {
                            const res = await fetch(`/api/cash-bucket/${e.id}`, { credentials: 'include' })
                            if (res.ok) setEntryDetail((await res.json()).data)
                          } finally {
                            setDetailLoading(false)
                          }
                        }} className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 ${isDeleted ? 'opacity-50' : ''}`}>
                          <td className="px-3 py-2 whitespace-nowrap text-secondary">
                            {new Date(e.entryDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 font-medium text-primary">{e.business?.name ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-secondary">
                            <div>{ENTRY_TYPE_LABEL[e.entryType] ?? e.entryType}</div>
                            {e.paymentChannel === 'ECOCASH' ? (
                              <span className="text-xs font-medium text-teal-600 dark:text-teal-400">📱 EcoCash</span>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">💵 Cash</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-secondary max-w-[180px]">
                            <div className="truncate">{e.notes ?? '—'}</div>
                            {isEdited && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" title={`Edited by ${e.editedBy?.name} on ${new Date(e.editedAt!).toLocaleDateString()}`}>
                                ✏️ {e.editedBy?.name ?? '?'}
                              </span>
                            )}
                            {isDeleted && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" title={e.deletionReason ?? ''}>
                                🗑️ {e.deletedBy?.name ?? '?'} · {e.deletionReason ?? 'no reason'}
                              </span>
                            )}
                          </td>
                          <td className={`px-3 py-2 text-right font-semibold ${isDeleted ? 'line-through text-secondary' : e.paymentChannel === 'ECOCASH' ? 'text-teal-600 dark:text-teal-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {e.direction === 'INFLOW' ? fmt(e.amount) : ''}
                          </td>
                          <td className={`px-3 py-2 text-right font-semibold text-red-600 dark:text-red-400 ${isDeleted ? 'line-through' : ''}`}>
                            {e.direction === 'OUTFLOW' ? fmt(e.amount) : ''}
                          </td>
                          <td className="px-3 py-2 text-secondary whitespace-nowrap print:hidden">
                            {e.createdBy?.name ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right text-secondary uppercase tracking-wide">Page Total</td>
                      <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">
                        {fmt(displayedEntries.filter(e => e.direction === 'INFLOW').reduce((s, e) => s + e.amount, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                        {fmt(displayedEntries.filter(e => e.direction === 'OUTFLOW').reduce((s, e) => s + e.amount, 0))}
                      </td>
                      <td className="print:hidden" />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              {total > limit && (
                <div className="print:hidden flex items-center justify-between mt-3 text-sm text-secondary">
                  <span>{offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={offset === 0}
                      onClick={() => { setOffset(Math.max(0, offset - limit)); load() }}
                      className="px-3 py-1 border border-border rounded disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >← Prev</button>
                    <button
                      disabled={offset + limit >= total}
                      onClick={() => { setOffset(offset + limit); load() }}
                      className="px-3 py-1 border border-border rounded disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Entry detail modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedEntry(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-semibold text-primary">
                  {ENTRY_TYPE_LABEL[selectedEntry.entryType] ?? selectedEntry.entryType}
                </h2>
                <p className="text-xs text-secondary mt-0.5">
                  {selectedEntry.business?.name} · {new Date(selectedEntry.entryDate).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="text-secondary hover:text-primary text-xl leading-none">×</button>
            </div>

            {/* Summary row */}
            <div className="px-5 py-3 border-b border-border shrink-0 flex items-center justify-between text-sm">
              <span className="text-secondary">
                {selectedEntry.paymentChannel === 'ECOCASH' ? '📱 EcoCash' : '💵 Cash'} ·
                {selectedEntry.direction === 'INFLOW' ? ' Inflow' : ' Outflow'}
              </span>
              <span className={`text-lg font-bold ${selectedEntry.direction === 'INFLOW' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {selectedEntry.direction === 'OUTFLOW' ? '−' : '+'}{fmt(selectedEntry.amount)}
              </span>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 text-sm">

              {selectedEntry.notes && (
                <p className="text-secondary italic">"{selectedEntry.notes}"</p>
              )}

              {/* Payment list */}
              {detailLoading && (
                <p className="text-secondary text-xs">Loading payments…</p>
              )}

              {!detailLoading && entryDetail?.payments?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                    Payments ({entryDetail.payments.length})
                  </p>
                  <div className="space-y-2">
                    {entryDetail.payments.map((p: any) => (
                      <div key={p.id} className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50">
                        <div className="min-w-0">
                          <p className="font-medium text-primary truncate">{p.payeeName}</p>
                          {p.category && <p className="text-xs text-secondary mt-0.5">{p.category}</p>}
                          {p.notes   && <p className="text-xs text-secondary truncate">{p.notes}</p>}
                          <p className="text-xs text-secondary mt-0.5">
                            {p.paymentChannel === 'ECOCASH' ? '📱 EcoCash' : '💵 Cash'} · {p.status}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400 shrink-0">
                          {fmt(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Petty cash detail */}
              {!detailLoading && entryDetail?.pettyCash && (
                <div className="rounded-lg border border-border px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 space-y-1.5">
                  <p className="font-medium text-primary">{entryDetail.pettyCash.purpose}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-secondary">
                    <span>Requested by</span><span className="text-primary font-medium">{entryDetail.pettyCash.requestedBy}</span>
                    <span>Requested</span><span>{fmt(entryDetail.pettyCash.requestedAmount)}</span>
                    {entryDetail.pettyCash.approvedAmount != null && <><span>Approved</span><span>{fmt(entryDetail.pettyCash.approvedAmount)}</span></>}
                    {entryDetail.pettyCash.spentAmount   != null && <><span>Spent</span><span>{fmt(entryDetail.pettyCash.spentAmount)}</span></>}
                    {entryDetail.pettyCash.returnAmount  != null && <><span>Returned</span><span>{fmt(entryDetail.pettyCash.returnAmount)}</span></>}
                    <span>Status</span><span>{entryDetail.pettyCash.status}</span>
                  </div>
                </div>
              )}

              {/* Audit trail */}
              <div className="space-y-1.5 pt-1 border-t border-border">
                <Row label="Recorded by" value={selectedEntry.createdBy?.name ?? '—'} />
                {selectedEntry.editedAt && (
                  <Row label="Edited" value={`${selectedEntry.editedBy?.name ?? '?'} · ${new Date(selectedEntry.editedAt).toLocaleDateString()}`} highlight="amber" />
                )}
                {selectedEntry.deletedAt && (
                  <>
                    <Row label="Deleted" value={`${selectedEntry.deletedBy?.name ?? '?'} · ${new Date(selectedEntry.deletedAt).toLocaleDateString()}`} highlight="red" />
                    {selectedEntry.deletionReason && <Row label="Reason" value={selectedEntry.deletionReason} highlight="red" />}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: 'amber' | 'red' }) {
  const valueClass = highlight === 'amber'
    ? 'text-amber-700 dark:text-amber-400'
    : highlight === 'red'
    ? 'text-red-600 dark:text-red-400'
    : bold ? 'font-semibold text-primary' : 'text-secondary'
  return (
    <div className="flex justify-between gap-4">
      <span className="text-secondary shrink-0">{label}</span>
      <span className={`text-right ${valueClass}`}>{value}</span>
    </div>
  )
}
