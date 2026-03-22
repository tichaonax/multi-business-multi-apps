'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingDay {
  date: string
  dayOfWeek: string
}

interface PreviewDay {
  date: string
  totalSales: number
  orderCount: number
}

interface RunResult {
  groupedRunId: string
  cashAllocationReportId: string
  datesProcessed: number
  summary: {
    totalSales: number
    totalRentTransferred: number
    totalAutoDeposited: number
    lineItemCount: number
  }
}

interface Props {
  businessId: string
  /** e.g. "/restaurant/reports/cash-allocation" — used to build the post-run link */
  cashAllocationPath: string
  onClose?: () => void
}

const DAY_ABBR: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
            ${i + 1 < current ? 'bg-green-500 text-white' :
              i + 1 === current ? 'bg-blue-600 text-white' :
              'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
            {i + 1 < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-8 ${i + 1 < current ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GroupedEODCatchup({ businessId, cashAllocationPath, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1
  const [pendingDays, setPendingDays] = useState<PendingDay[]>([])
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [loadingDays, setLoadingDays] = useState(true)

  // Step 2
  const [previewData, setPreviewData] = useState<PreviewDay[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Step 3
  const [managerName, setManagerName] = useState('')
  const [totalCashReceived, setTotalCashReceived] = useState('')
  const [totalEcocashReceived, setTotalEcocashReceived] = useState('')
  const [notes, setNotes] = useState('')

  // Step 4 (submit)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Load pending days on mount ──────────────────────────────────────────────
  useEffect(() => {
    setLoadingDays(true)
    fetch(`/api/eod/pending-days?businessId=${businessId}`)
      .then(r => r.json())
      .then(d => setPendingDays(d.data ?? []))
      .catch(() => setPendingDays([]))
      .finally(() => setLoadingDays(false))
  }, [businessId])

  const toggleDate = (date: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

  const selectAll = () => setSelectedDates(new Set(pendingDays.map(d => d.date)))
  const clearAll  = () => setSelectedDates(new Set())

  // ── Step 1 → 2: fetch preview ───────────────────────────────────────────────
  const goToPreview = useCallback(async () => {
    setError(null)
    setLoadingPreview(true)
    try {
      const res = await fetch('/api/eod/grouped-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, dates: Array.from(selectedDates) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load preview')
      setPreviewData(data.data ?? [])
      setStep(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoadingPreview(false)
    }
  }, [businessId, selectedDates])

  // ── Step 3 → 4: submit grouped run ─────────────────────────────────────────
  const submitRun = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/eod/grouped-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          managerName: managerName.trim(),
          notes: notes.trim() || undefined,
          totalCashReceived: parseFloat(totalCashReceived) || 0,
          totalEcocashReceived: parseFloat(totalEcocashReceived) || 0,
          dates: previewData.map(d => ({ date: d.date, totalSales: d.totalSales })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to run grouped EOD')
      setResult(data)
      setStep(4)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  const totalSales = previewData.reduce((s, d) => s + d.totalSales, 0)
  const cashNum = parseFloat(totalCashReceived) || 0
  const ecocashNum = parseFloat(totalEcocashReceived) || 0

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {step < 4 && <StepIndicator current={step} total={3} />}

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── STEP 1: Select pending dates ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Select Days to Close
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              These past days have no locked EOD report. Select all days you want to catch up.
            </p>
          </div>

          {loadingDays ? (
            <div className="py-6 text-center text-sm text-gray-400">Loading pending days…</div>
          ) : pendingDays.length === 0 ? (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-4 text-sm text-green-700 dark:text-green-300">
              ✅ All business days are closed. No catch-up needed.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={selectAll} className="text-blue-600 dark:text-blue-400 hover:underline">Select all ({pendingDays.length})</button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button onClick={clearAll} className="text-gray-500 dark:text-gray-400 hover:underline">Clear</button>
                {selectedDates.size > 0 && (
                  <span className="text-gray-600 dark:text-gray-400 font-medium">{selectedDates.size} selected</span>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-h-80 overflow-y-auto">
                {pendingDays.map((day, idx) => (
                  <label
                    key={day.date}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                      ${idx > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}
                      ${selectedDates.has(day.date) ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDates.has(day.date)}
                      onChange={() => toggleDate(day.date)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 w-10">
                      {DAY_ABBR[day.dayOfWeek] ?? day.dayOfWeek}
                    </span>
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                      {fmtDate(day.date)}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            {onClose && (
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                Cancel
              </button>
            )}
            <button
              onClick={goToPreview}
              disabled={selectedDates.size === 0 || loadingPreview}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                text-white text-sm font-medium rounded-md"
            >
              {loadingPreview ? 'Loading…' : `Preview ${selectedDates.size} day${selectedDates.size !== 1 ? 's' : ''} →`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview sales ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Sales Preview
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review the sales totals for each selected day before signing off.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Orders</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Sales</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
                {previewData.map(d => (
                  <tr key={d.date}>
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">
                      {fmtDate(d.date)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-400">
                      {d.orderCount}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {d.totalSales > 0 ? `$${d.totalSales.toFixed(2)}` : <span className="text-gray-400 font-normal">$0.00 (no sales)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <td className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Total</td>
                  <td className="px-4 py-2 text-right text-sm text-gray-600 dark:text-gray-400">
                    {previewData.reduce((s, d) => s + d.orderCount, 0)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-gray-900 dark:text-gray-100">
                    ${totalSales.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {previewData.some(d => d.totalSales === 0) && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠ Days with $0 sales will still be formally closed — this is expected for days with no activity.
            </p>
          )}

          <div className="flex justify-between gap-3 pt-2">
            <button onClick={() => { setStep(1); setError(null) }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              ← Back
            </button>
            <button
              onClick={() => { setStep(3); setError(null) }}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md"
            >
              Manager Sign-Off →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Manager sign-off ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Manager Sign-Off
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter the total cash the manager is handing to the cashier, then confirm.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Manager Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={managerName}
                onChange={e => setManagerName(e.target.value)}
                placeholder="Full name"
                className="w-full border rounded-md px-3 py-2 text-sm
                  border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700
                  text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Cash Received from Manager <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalCashReceived}
                  onChange={e => setTotalCashReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full border rounded-md pl-7 pr-3 py-2 text-sm font-mono
                    border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700
                    text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {cashNum > 0 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Total sales across {previewData.length} day{previewData.length !== 1 ? 's' : ''}: ${totalSales.toFixed(2)}
                  {Math.abs(cashNum - totalSales) > 0.01 && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      ⚠ Variance: {cashNum > totalSales ? '+' : ''}${(cashNum - totalSales).toFixed(2)}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total EcoCash Received (period) <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalEcocashReceived}
                  onChange={e => setTotalEcocashReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full border rounded-md pl-7 pr-3 py-2 text-sm font-mono
                    border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700
                    text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Confirmed EcoCash transactions received to the business phone over the catch-up period.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Catch-up for system downtime period"
                className="w-full border rounded-md px-3 py-2 text-sm
                  border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700
                  text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Summary before submit */}
          <div className="rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-sm space-y-1">
            <p className="font-medium text-gray-700 dark:text-gray-300">Closing {previewData.length} day{previewData.length !== 1 ? 's' : ''}:</p>
            <p className="text-gray-500 dark:text-gray-400 font-mono text-xs">
              {previewData.map(d => fmtDate(d.date)).join(' · ')}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Combined sales: <span className="font-semibold font-mono">${totalSales.toFixed(2)}</span>
            </p>
            {cashNum > 0 && (
              <p className="text-gray-600 dark:text-gray-400">
                Cash to record: <span className="font-semibold font-mono">${cashNum.toFixed(2)}</span>
              </p>
            )}
            {ecocashNum > 0 && (
              <p className="text-teal-700 dark:text-teal-300">
                EcoCash to record: <span className="font-semibold font-mono">${ecocashNum.toFixed(2)}</span>
              </p>
            )}
          </div>

          <div className="flex justify-between gap-3 pt-2">
            <button onClick={() => { setStep(2); setError(null) }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              ← Back
            </button>
            <button
              onClick={submitRun}
              disabled={submitting || !managerName.trim() || !totalCashReceived}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                text-white text-sm font-semibold rounded-md"
            >
              {submitting ? 'Processing…' : `Run EOD Catch-Up for ${previewData.length} Day${previewData.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Success ── */}
      {step === 4 && result && (
        <div className="space-y-5">
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <h3 className="text-base font-semibold text-green-800 dark:text-green-200">
                EOD Catch-Up Complete
              </h3>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              {result.datesProcessed} day{result.datesProcessed !== 1 ? 's' : ''} have been formally closed and locked.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Summary</span>
            </div>
            <div className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-gray-600 dark:text-gray-400">Days closed</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{result.datesProcessed}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-gray-600 dark:text-gray-400">Total sales</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">${result.summary.totalSales.toFixed(2)}</span>
              </div>
              {result.summary.totalRentTransferred > 0 && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-600 dark:text-gray-400">Rent transferred</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">${result.summary.totalRentTransferred.toFixed(2)}</span>
                </div>
              )}
              {result.summary.totalAutoDeposited > 0 && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-600 dark:text-gray-400">Auto-deposits</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">${result.summary.totalAutoDeposited.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-gray-600 dark:text-gray-400">Cash allocation line items</span>
                <span className="text-gray-700 dark:text-gray-300">{result.summary.lineItemCount}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3 text-sm text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-1">Next step for cashier:</p>
            <p>Open the grouped cash allocation report to confirm each deposit and lock the record.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Link
              href={`${cashAllocationPath}?reportId=${result.cashAllocationReportId}`}
              className="flex-1 text-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md"
            >
              Open Cash Allocation Report →
            </Link>
            {onClose && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm rounded-md"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
