'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface EodRecord {
  id: string
  salespersonId: string
  status: string
  cashAmount: number
  ecocashAmount: number
  submittedAt: string | null
  notes: string | null
  salesperson: { id: string; name: string }
  submittedBy: { id: string; name: string } | null
}

interface Props {
  businessId: string
  reportDate?: string  // YYYY-MM-DD — business day date; defaults to today if omitted
  onTotalsReady?: (info: { cashTotal: number; ecocashTotal: number; allSubmitted: boolean }) => void
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'SUBMITTED')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">Submitted</span>
  if (status === 'OVERRIDDEN')
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">Override</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Pending</span>
}

export function SalespersonEodReportSection({ businessId, reportDate, onTotalsReady }: Props) {
  const [records, setRecords] = useState<EodRecord[]>([])
  const [totals, setTotals] = useState<{ cashTotal: number; ecocashTotal: number } | null>(null)
  const [counts, setCounts] = useState<{ total: number; pending: number; submitted: number; overridden: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [queryDate, setQueryDate] = useState<string>('')

  useEffect(() => {
    if (!businessId) return
    const d = new Date()
    const todayLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const localDate = reportDate ?? todayLocal
    setQueryDate(localDate)
    fetch(`/api/eod/salesperson/all?businessId=${businessId}&date=${localDate}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setRecords(json.data)
          setTotals(json.totals)
          setCounts(json.counts)
          if (onTotalsReady && json.counts) {
            onTotalsReady({
              cashTotal: json.totals?.cashTotal ?? 0,
              ecocashTotal: json.totals?.ecocashTotal ?? 0,
              allSubmitted: json.counts.pending === 0 && json.counts.total > 0,
            })
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [businessId, reportDate])

  if (loading || !counts || counts.total === 0) return null

  const allDone = counts.pending === 0
  const done = counts.submitted + counts.overridden

  return (
    <div className="mb-8 no-print">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-300 dark:border-gray-600">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          👥 SALESPERSON EOD REPORTS
        </h3>
        <Link
          href="/eod/manager"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Open EOD Manager →
        </Link>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${counts.total > 0 ? Math.round((done / counts.total) * 100) : 0}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
          {done}/{counts.total} submitted
        </span>
        {counts.pending > 0 && (
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
            {counts.pending} pending
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">Salesperson</th>
              <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100">Status</th>
              <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Cash</th>
              <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">EcoCash</th>
              <th className="text-right p-3 font-semibold text-gray-900 dark:text-gray-100">Submitted</th>
              <th className="text-center p-3 font-semibold text-gray-900 dark:text-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{r.salesperson.name}</td>
                <td className="p-3 text-center"><StatusBadge status={r.status} /></td>
                <td className="p-3 text-right text-gray-900 dark:text-gray-100">
                  {r.status === 'PENDING' ? <span className="text-gray-400">—</span> : `$${Number(r.cashAmount).toFixed(2)}`}
                </td>
                <td className="p-3 text-right text-gray-900 dark:text-gray-100">
                  {r.status === 'PENDING' ? <span className="text-gray-400">—</span> : `$${Number(r.ecocashAmount).toFixed(2)}`}
                </td>
                <td className="p-3 text-right text-gray-500 dark:text-gray-400 text-xs">
                  {r.submittedAt
                    ? new Date(r.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </td>
                <td className="p-3 text-center">
                  {r.status === 'PENDING' && new Date(r.reportDate).toISOString().slice(0, 10) < queryDate && (
                    <Link
                      href="/eod/manager"
                      className="text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 px-2.5 py-1 rounded-lg"
                    >
                      Override
                    </Link>
                  )}
                </td>
              </tr>
            ))}

            {/* Totals row */}
            {totals && (
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 font-bold">
                <td className="p-3 text-gray-900 dark:text-gray-100" colSpan={2}>TOTALS (submitted)</td>
                <td className="p-3 text-right text-gray-900 dark:text-gray-100">${totals.cashTotal.toFixed(2)}</td>
                <td className="p-3 text-right text-gray-900 dark:text-gray-100">${totals.ecocashTotal.toFixed(2)}</td>
                <td colSpan={2} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {allDone && (
        <p className="mt-2 text-xs text-green-700 dark:text-green-300 font-medium">
          ✅ All salesperson EODs submitted — ready to close books.
        </p>
      )}
    </div>
  )
}
