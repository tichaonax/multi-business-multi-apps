'use client'

import { useState } from 'react'

export interface EcocashConversion {
  id: string
  businessId: string
  business?: { id: string; name: string; type: string }
  amount: number
  tenderedAmount: number | null
  variance: number | null
  notes: string | null
  status: string
  requestedAt: string
  requester?: { id: string; name: string; email: string }
  approver?: { id: string; name: string; email: string }
  completer?: { id: string; name: string; email: string }
  rejecter?: { id: string; name: string; email: string }
  approvedAt: string | null
  completedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  transactionCode: string | null
  ecocashAmount: number | null
  cashTendered: number | null
  outflowEntryId: string | null
  inflowEntryId: string | null
}

interface Props {
  conversions: EcocashConversion[]
  loading: boolean
  onApprove: (conversion: EcocashConversion) => void
  onComplete: (conversion: EcocashConversion) => void
  onReject: (conversion: EcocashConversion) => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED:  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED:  'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const STATUS_ICONS: Record<string, string> = {
  PENDING:   '⏳',
  APPROVED:  '✅',
  COMPLETED: '🟢',
  REJECTED:  '❌',
}

export function EcocashConversionList({ conversions, loading, onApprove, onComplete, onReject }: Props) {
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = statusFilter
    ? conversions.filter(c => c.status === statusFilter)
    : conversions

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading conversions…</p>

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s === '' ? 'All' : `${STATUS_ICONS[s]} ${s[0] + s.slice(1).toLowerCase()}`}
            {s !== '' && (
              <span className="ml-1 opacity-70">
                ({conversions.filter(c => c.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No conversions found.</p>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60">
          {filtered.map(c => (
            <div key={c.id} className="px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Business + status */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                      {c.business?.name ?? c.businessId}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_ICONS[c.status]} {c.status}
                    </span>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-1 flex-wrap">
                    <span>Requested: <span className="font-semibold text-gray-900 dark:text-white">{fmt(c.amount)}</span></span>
                    {c.tenderedAmount !== null && (
                      <span>
                        Tendered: <span className="font-semibold text-teal-700 dark:text-teal-300">{fmt(c.tenderedAmount)}</span>
                      </span>
                    )}
                    {c.variance !== null && c.variance !== 0 && (
                      <span className={c.variance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                        {c.variance > 0 ? '+' : ''}{fmt(c.variance)} variance
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
                    <div>Requested by {c.requester?.name ?? 'Unknown'} · {new Date(c.requestedAt).toLocaleDateString()}</div>
                    {c.approver && c.approvedAt && (
                      <div>Approved by {c.approver.name} · {new Date(c.approvedAt).toLocaleDateString()}</div>
                    )}
                    {c.completer && c.completedAt && (
                      <div>Completed by {c.completer.name} · {new Date(c.completedAt).toLocaleDateString()}</div>
                    )}
                    {c.transactionCode && (
                      <div className="font-mono text-teal-600 dark:text-teal-400">Txn: {c.transactionCode}</div>
                    )}
                    {c.ecocashAmount !== null && c.cashTendered !== null && (
                      <div>
                        <span className="text-gray-500">EcoCash: </span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{fmt(c.ecocashAmount)}</span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="text-gray-500">Cash: </span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">${c.cashTendered}</span>
                      </div>
                    )}
                    {c.rejecter && c.rejectedAt && (
                      <div className="text-red-500">Rejected by {c.rejecter.name}: {c.rejectionReason}</div>
                    )}
                    {c.notes && <div className="italic">{c.notes}</div>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 shrink-0">
                  {c.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => onApprove(c)}
                        className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReject(c)}
                        className="px-3 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {c.status === 'APPROVED' && (
                    <>
                      <button
                        onClick={() => onComplete(c)}
                        className="px-3 py-1 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => onReject(c)}
                        className="px-3 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
