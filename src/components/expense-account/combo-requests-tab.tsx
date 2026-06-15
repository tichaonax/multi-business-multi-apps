'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ComboRequest {
  id: string
  title: string
  status: string
  requestedAmount: number
  approvedAmount: number | null
  createdBy: string
  submittedAt: string | null
  returnNote: string | null
  returnedByUser: { id: string; name: string } | null
  creator: { id: string; name: string }
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT:              { label: 'Draft',          className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  SUBMITTED:          { label: 'Submitted',      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  APPROVED:           { label: 'Approved',       className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  PARTIALLY_APPROVED: { label: 'Partial',        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  PARTIALLY_PAID:     { label: 'Partially Paid', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  PAID:               { label: 'Paid',           className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  SETTLE_REQUESTED:   { label: 'Awaiting Settlement', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  SETTLED:            { label: 'Settled',         className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
  CANCELLED:          { label: 'Cancelled',      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

interface ComboRequestsTabProps {
  accountId: string
}

export function ComboRequestsTab({ accountId }: ComboRequestsTabProps) {
  const router = useRouter()
  const [requests, setRequests] = useState<ComboRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/expense-account/${accountId}/combo-requests`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          setRequests(
            data.data.map((r: any) => ({
              ...r,
              requestedAmount: Number(r.requestedAmount),
              approvedAmount: r.approvedAmount !== null ? Number(r.approvedAmount) : null,
            }))
          )
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId])

  const pendingCount = requests.filter(r => r.status === 'SUBMITTED').length
  const returnedCount = requests.filter(r => r.status === 'DRAFT' && r.returnNote).length
  const settleRequestedCount = requests.filter(r => r.status === 'SETTLE_REQUESTED').length

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Combo Requests</h2>
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-yellow-400 text-white">
              {pendingCount}
            </span>
          )}
          {returnedCount > 0 && (
            <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              ↩ {returnedCount} needs revision
            </span>
          )}
          {settleRequestedCount > 0 && (
            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-bold bg-purple-500 text-white">
              💰 {settleRequestedCount} awaiting settlement
            </span>
          )}
        </div>
        <button
          onClick={() => router.push(`/expense-accounts/${accountId}/combo-requests/new`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          + New Combo Request
        </button>
      </div>

      {loading && (
        <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Loading...</div>
      )}

      {!loading && requests.length === 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          No combo requests yet.{' '}
          <button
            onClick={() => router.push(`/expense-accounts/${accountId}/combo-requests/new`)}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create one
          </button>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          {requests.map(req => {
            const isReturned = req.status === 'DRAFT' && !!req.returnNote
            const badge = isReturned
              ? { label: '↩ Needs Revision', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
              : STATUS_BADGE[req.status] ?? { label: req.status, className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }
            return (
              <button
                key={req.id}
                onClick={() => router.push(`/expense-accounts/${accountId}/combo-requests/${req.id}`)}
                className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left ${
                  isReturned
                    ? 'bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-600'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{req.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {req.creator.name}
                    {req.submittedAt && ` · ${fmtDate(req.submittedAt)}`}
                  </p>
                  {isReturned && req.returnNote && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 italic line-clamp-2">
                      &ldquo;{req.returnNote}&rdquo;
                      {req.returnedByUser && (
                        <span className="not-italic text-amber-600 dark:text-amber-500"> — {req.returnedByUser.name}</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(req.requestedAmount)}</div>
                  {req.approvedAmount !== null && req.approvedAmount !== req.requestedAmount && (
                    <div className="text-xs text-green-600 dark:text-green-400">Approved: {fmt(req.approvedAmount)}</div>
                  )}
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
                {['DRAFT', 'SUBMITTED'].includes(req.status) && (
                  <a
                    href={`/expense-accounts/${accountId}/combo-requests/${req.id}/edit`}
                    onClick={e => e.stopPropagation()}
                    className="shrink-0 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    title="Edit this request"
                  >
                    ✎ Edit
                  </a>
                )}
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
