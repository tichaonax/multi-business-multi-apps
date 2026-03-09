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
  entryDate: string
  createdBy: { id: string; name: string } | null
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
  const [offset, setOffset] = useState(0)
  const limit = 100

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        </div>

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
        </div>

        {/* Ledger */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-primary">
              Ledger {total > 0 && <span className="text-secondary font-normal">({total} entries)</span>}
            </h2>
          </div>

          {loading ? (
            <p className="text-sm text-secondary">Loading…</p>
          ) : entries.length === 0 ? (
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
                    {entries.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-3 py-2 whitespace-nowrap text-secondary">
                          {new Date(e.entryDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 font-medium text-primary">{e.business?.name ?? '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-secondary">
                          {ENTRY_TYPE_LABEL[e.entryType] ?? e.entryType}
                        </td>
                        <td className="px-3 py-2 text-secondary max-w-[180px] truncate">{e.notes ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {e.direction === 'INFLOW' ? fmt(e.amount) : ''}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600 dark:text-red-400">
                          {e.direction === 'OUTFLOW' ? fmt(e.amount) : ''}
                        </td>
                        <td className="px-3 py-2 text-secondary whitespace-nowrap print:hidden">
                          {e.createdBy?.name ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right text-secondary uppercase tracking-wide">Page Total</td>
                      <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">
                        {fmt(entries.filter(e => e.direction === 'INFLOW').reduce((s, e) => s + e.amount, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                        {fmt(entries.filter(e => e.direction === 'OUTFLOW').reduce((s, e) => s + e.amount, 0))}
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
    </ContentLayout>
  )
}
