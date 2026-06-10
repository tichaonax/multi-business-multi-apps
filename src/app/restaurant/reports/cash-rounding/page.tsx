'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface RoundingLog {
  id: string
  direction: 'UP' | 'DOWN'
  originalAmount: number
  roundedAmount: number
  adjustment: number
  orderId: string | null
  staffNote: string | null
  createdAt: string
}

interface Summary {
  totalEvents: number
  upCount: number
  downCount: number
  totalRoundedUp: number
  totalRoundedDown: number
}

type Preset = 'today' | 'week' | 'month'

function getPresetDates(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = fmt(now)

  if (preset === 'today') return { from: today, to: today }
  if (preset === 'week') {
    const mon = new Date(now)
    mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    return { from: fmt(mon), to: today }
  }
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: fmt(firstOfMonth), to: today }
}

export default function CashRoundingReportPage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const [preset, setPreset] = useState<Preset>('today')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [logs, setLogs] = useState<RoundingLog[]>([])
  const [loading, setLoading] = useState(false)

  const businessType = currentBusiness?.businessType || 'restaurant'

  const load = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    const { from, to } = getPresetDates(preset)
    try {
      const res = await fetch(
        `/api/universal/cash-rounding-report?businessId=${currentBusinessId}&from=${from}&to=${to}`
      )
      const data = await res.json()
      if (data.success) {
        setSummary(data.summary)
        setLogs(data.logs)
      }
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, preset])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="mb-6">
        <Link
          href={`/${businessType}/reports`}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-block"
        >
          ← Back to Reports
        </Link>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🪙 Cash Rounding Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            All cash rounding events — up, down, and AYLI distributions
          </p>
        </div>

        {/* Preset pills */}
        <div className="flex gap-2 mb-6">
          {(['today', 'week', 'month'] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                preset === p
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        )}

        {!loading && summary && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalEvents}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Events</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{summary.upCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Rounded Up</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{summary.downCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Rounded Down</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  ${(summary.totalRoundedUp - summary.totalRoundedDown).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Net Collected</div>
              </div>
            </div>

            {/* Log table */}
            {logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No rounding events in this period.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Direction</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Original</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rounded</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Adjustment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            log.direction === 'UP'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {log.direction === 'UP' ? '↑ Up' : '↓ Down'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">${log.originalAmount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">${log.roundedAmount.toFixed(2)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          log.direction === 'UP' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {log.direction === 'UP' ? '+' : '-'}${Math.abs(log.adjustment).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {log.staffNote || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
