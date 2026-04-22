'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { formatCurrency } from '@/lib/date-format'

interface EodRecord {
  id: string
  reportDate: string
  cashAmount: string
  ecocashAmount: string
  notes: string | null
  status: string
  submittedAt: string | null
  isManagerOverride: boolean
  overrideReason: string | null
  submittedBy: { id: string; name: string } | null
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'SUBMITTED') return <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 rounded text-xs font-semibold">Submitted</span>
  if (status === 'OVERRIDDEN') return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded text-xs font-semibold">Manager Override</span>
  return <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded text-xs font-semibold">Pending</span>
}

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function EodHistoryPage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()

  const defaultTo = toInputDate(new Date())
  const defaultFrom = toInputDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [page, setPage] = useState(1)
  const [records, setRecords] = useState<EodRecord[]>([])
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (p = 1) => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/eod/salesperson/history?businessId=${currentBusinessId}&from=${from}&to=${to}&page=${p}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRecords(json.data || [])
      setPagination(json.pagination)
      setPage(p)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, from, to])

  useEffect(() => {
    if (currentBusinessId) loadData(1)
  }, [currentBusinessId, loadData])

  const handleApply = () => loadData(1)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">My EOD History</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            {currentBusiness?.businessName || 'Business'} — your end-of-day submission records
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-lg font-semibold">No EOD records found</p>
            <p className="text-sm mt-1">Your submitted end-of-day reports will appear here.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {records.map(r => (
                <div
                  key={r.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {new Date(r.reportDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {r.submittedAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Submitted {new Date(r.submittedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
                          {r.isManagerOverride && r.submittedBy && ` by ${r.submittedBy.name}`}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  {r.status !== 'PENDING' && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">💵 Cash</p>
                        <p className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(Number(r.cashAmount))}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">📱 EcoCash</p>
                        <p className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(Number(r.ecocashAmount))}</p>
                      </div>
                    </div>
                  )}

                  {r.notes && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">"{r.notes}"</p>
                  )}

                  {r.isManagerOverride && r.overrideReason && (
                    <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2 text-xs text-amber-800 dark:text-amber-200">
                      <strong>Override reason:</strong> {r.overrideReason}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => loadData(page - 1)}
                  disabled={page <= 1 || loading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {pagination.totalPages} ({pagination.total} records)
                </span>
                <button
                  onClick={() => loadData(page + 1)}
                  disabled={page >= pagination.totalPages || loading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
