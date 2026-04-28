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
  savedReportId: string | null
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [catchupForm, setCatchupForm] = useState({ cashAmount: '', ecocashAmount: '', notes: '' })
  const [ecocashLoading, setEcocashLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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

  const handleExpand = async (record: EodRecord) => {
    const isOpening = expandedId !== record.id
    setExpandedId(prev => prev === record.id ? null : record.id)
    setCatchupForm({ cashAmount: '', ecocashAmount: '', notes: '' })
    setSubmitError(null)

    if (isOpening && currentBusinessId) {
      setEcocashLoading(true)
      try {
        const date = record.reportDate.slice(0, 10)
        const res = await fetch(`/api/eod/salesperson/ecocash-for-date?businessId=${currentBusinessId}&date=${date}`)
        const json = await res.json()
        if (json.success) {
          setCatchupForm(f => ({ ...f, ecocashAmount: Number(json.ecocashAmount).toFixed(2) }))
        }
      } catch { /* silent — leave blank */ } finally {
        setEcocashLoading(false)
      }
    }
  }

  const handleCatchupSubmit = async (r: EodRecord) => {
    if (!currentBusinessId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/eod/salesperson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          reportDate: r.reportDate.slice(0, 10),
          cashAmount: parseFloat(catchupForm.cashAmount) || 0,
          ecocashAmount: parseFloat(catchupForm.ecocashAmount) || 0,
          notes: catchupForm.notes || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit')
      setExpandedId(null)
      loadData(page)
    } catch (e: any) {
      setSubmitError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

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
                        {new Date(r.reportDate.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {r.submittedAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Submitted {new Date(r.submittedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
                          {r.isManagerOverride && r.submittedBy && ` by ${r.submittedBy.name}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={r.status} />
                      {r.status === 'PENDING' && (
                        <button
                          onClick={() => handleExpand(r)}
                          className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          {expandedId === r.id ? 'Cancel' : 'Submit'}
                        </button>
                      )}
                      {r.savedReportId && r.status !== 'PENDING' && (
                        <Link
                          href={`/${currentBusiness?.businessType || 'grocery'}/reports/saved/${r.savedReportId}`}
                          className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors whitespace-nowrap"
                        >
                          View Manager Report →
                        </Link>
                      )}
                    </div>
                  </div>

                  {r.status === 'PENDING' && expandedId === r.id && (
                    <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">💵 Cash (US$)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={catchupForm.cashAmount}
                            onChange={e => setCatchupForm(f => ({ ...f, cashAmount: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            📱 EcoCash (US$)
                            <span className="ml-1 font-normal text-gray-400">(auto-filled)</span>
                          </label>
                          <input
                            type="number"
                            readOnly
                            tabIndex={-1}
                            value={ecocashLoading ? '' : catchupForm.ecocashAmount}
                            placeholder={ecocashLoading ? 'Loading…' : '0.00'}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-sm cursor-default bg-gray-50"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Notes (optional)</label>
                        <textarea
                          rows={2}
                          value={catchupForm.notes}
                          onChange={e => setCatchupForm(f => ({ ...f, notes: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm resize-none"
                          placeholder="Any notes for this day…"
                        />
                      </div>
                      {submitError && (
                        <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
                      )}
                      <button
                        onClick={() => handleCatchupSubmit(r)}
                        disabled={submitting || ecocashLoading}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ecocashLoading ? 'Loading EcoCash…' : submitting ? 'Submitting…' : 'Submit EOD Report'}
                      </button>
                    </div>
                  )}

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

                  {r.notes && r.status !== 'PENDING' && (
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
