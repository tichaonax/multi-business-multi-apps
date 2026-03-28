'use client'

import { useState, useEffect } from 'react'

interface PerDiemEntry {
  id: string
  date: string
  amount: number
  purpose: string
  notes?: string | null
  approvalStatus: string
}

interface PerDiemApprovalModalProps {
  isOpen: boolean
  onClose: (approvedAmount: number, approvedCount: number, totalCount: number) => void
  employeeId: string
  employeeName: string
  payrollYear: number
  payrollMonth: number
  businessId?: string | null
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const PURPOSE_COLORS: Record<string, string> = {
  Lodging:     'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Meals:       'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Incidentals: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Travel:      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Other:       'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function PerDiemApprovalModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  payrollYear,
  payrollMonth,
  businessId,
}: PerDiemApprovalModalProps) {
  const [entries, setEntries] = useState<PerDiemEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<Record<string, boolean>>({})
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    fetchEntries()
  }, [isOpen, employeeId, payrollYear, payrollMonth])

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        employeeId,
        payrollYear: String(payrollYear),
        payrollMonth: String(payrollMonth),
        ...(businessId ? { businessId } : {}),
      })
      const res = await fetch(`/api/per-diem/entries?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setEntries(json.data?.entries ?? [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (entryId: string, status: 'approved' | 'rejected' | 'pending') => {
    setUpdating(prev => ({ ...prev, [entryId]: true }))
    try {
      const res = await fetch(`/api/per-diem/entries/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approvalStatus: status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, approvalStatus: status } : e))
    } catch {
      // silently ignore
    } finally {
      setUpdating(prev => ({ ...prev, [entryId]: false }))
    }
  }

  const approvedEntries = entries.filter(e => e.approvalStatus === 'approved')
  const approvedCount = approvedEntries.length
  const approvedAmount = approvedEntries.reduce((s, e) => s + e.amount, 0)
  const pendingCount = entries.filter(e => e.approvalStatus === 'pending').length

  const handleProcess = async () => {
    setProcessing(true)
    // Small delay to show feedback before close
    await new Promise(r => setTimeout(r, 150))
    setProcessing(false)
    onClose(approvedAmount, approvedCount, entries.length)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => onClose(approvedAmount, approvedCount, entries.length)} />
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Per Diem Review</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {employeeName} · {MONTH_NAMES[payrollMonth - 1]} {payrollYear}
            </p>
          </div>
          <button
            onClick={() => onClose(approvedAmount, approvedCount, entries.length)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">No per diem entries found.</div>
          ) : (
            entries.map(entry => (
              <div
                key={entry.id}
                className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
                  entry.approvalStatus === 'approved'
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                    : entry.approvalStatus === 'rejected'
                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 opacity-60'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                {/* Date */}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 shrink-0">
                  {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>

                {/* Purpose badge */}
                <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${PURPOSE_COLORS[entry.purpose] ?? PURPOSE_COLORS.Other}`}>
                  {entry.purpose}
                </span>

                {/* Notes */}
                {entry.notes ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">{entry.notes}</span>
                ) : (
                  <span className="flex-1" />
                )}

                {/* Amount */}
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0 w-16 text-right">
                  {fmt(entry.amount)}
                </span>

                {/* Action */}
                <div className="flex items-center gap-1 shrink-0 w-36 justify-end">
                  {entry.approvalStatus === 'approved' ? (
                    <>
                      <span className="text-xs text-green-700 dark:text-green-400 font-semibold">✓ Approved</span>
                      <button
                        onClick={() => updateStatus(entry.id, 'pending')}
                        disabled={updating[entry.id]}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2 underline"
                      >
                        Undo
                      </button>
                    </>
                  ) : entry.approvalStatus === 'rejected' ? (
                    <>
                      <span className="text-xs text-red-600 dark:text-red-400 font-semibold">✕ Rejected</span>
                      <button
                        onClick={() => updateStatus(entry.id, 'pending')}
                        disabled={updating[entry.id]}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2 underline"
                      >
                        Undo
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => updateStatus(entry.id, 'approved')}
                        disabled={updating[entry.id]}
                        className="px-2.5 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(entry.id, 'rejected')}
                        disabled={updating[entry.id]}
                        className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {entries.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3">
            {/* Summary row */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
              <div className="flex items-center gap-3">
                <span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{approvedCount}</span> approved
                  {' · '}
                  <span className="font-semibold text-red-500">{entries.length - approvedCount - pendingCount}</span> rejected
                  {pendingCount > 0 && (
                    <> · <span className="font-semibold text-orange-500">{pendingCount} pending</span></>
                  )}
                </span>
              </div>
              <span>
                Approved total:{' '}
                <span className="font-semibold text-green-600 dark:text-green-400">{fmt(approvedAmount)}</span>
              </span>
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Submitted total: <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(entries.reduce((s, e) => s + e.amount, 0))}</span>
              </span>
              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <span className="text-xs text-orange-500">⚠ {pendingCount} item{pendingCount > 1 ? 's' : ''} not reviewed</span>
                )}
                <button
                  onClick={handleProcess}
                  disabled={processing || approvedCount === 0}
                  className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing…' : `Process (${fmt(approvedAmount)})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
