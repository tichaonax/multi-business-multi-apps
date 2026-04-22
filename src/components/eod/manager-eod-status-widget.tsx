'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Props {
  businessId: string
  deadlineTime?: string | null
}

export function ManagerEodStatusWidget({ businessId, deadlineTime }: Props) {
  const [summary, setSummary] = useState<{ pending: number; submitted: number; overridden: number; total: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return
    fetch(`/api/eod/salesperson/today-summary?businessId=${businessId}`)
      .then(r => r.json())
      .then(json => { if (json.success) setSummary(json) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [businessId])

  if (loading || !summary || summary.total === 0) return null

  const done = summary.submitted + summary.overridden
  const allDone = summary.pending === 0
  const pct = summary.total > 0 ? Math.round((done / summary.total) * 100) : 0

  const now = new Date()
  const deadlinePassed = deadlineTime
    ? (() => {
        const [h, m] = deadlineTime.split(':').map(Number)
        const deadline = new Date(now)
        deadline.setHours(h, m, 0, 0)
        return now >= deadline
      })()
    : false

  const barColor = allDone
    ? 'bg-green-500'
    : deadlinePassed
    ? 'bg-red-500'
    : 'bg-amber-500'

  const borderColor = allDone
    ? 'border-green-200 dark:border-green-800'
    : deadlinePassed
    ? 'border-red-200 dark:border-red-800'
    : 'border-amber-200 dark:border-amber-800'

  const bgColor = allDone
    ? 'bg-green-50 dark:bg-green-900/20'
    : deadlinePassed
    ? 'bg-red-50 dark:bg-red-900/20'
    : 'bg-amber-50 dark:bg-amber-900/20'

  return (
    <div className={`rounded-lg border p-4 ${bgColor} ${borderColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Staff EOD Reports — Today</h3>
        </div>
        <Link
          href="/eod/manager"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          View all →
        </Link>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-green-600 dark:text-green-400 font-semibold">{done} submitted</span>
          {summary.pending > 0 && (
            <span className="text-red-600 dark:text-red-400 font-semibold">{summary.pending} pending</span>
          )}
        </div>
        <span className="text-gray-500 dark:text-gray-400 text-xs">{done}/{summary.total}</span>
      </div>

      {allDone && (
        <p className="mt-2 text-xs text-green-700 dark:text-green-300 font-medium">All salesperson EODs submitted</p>
      )}
      {!allDone && deadlinePassed && (
        <p className="mt-2 text-xs text-red-700 dark:text-red-300 font-medium">
          Deadline passed — {summary.pending} report{summary.pending !== 1 ? 's' : ''} still pending
        </p>
      )}
    </div>
  )
}
