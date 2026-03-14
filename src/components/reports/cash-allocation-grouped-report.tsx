'use client'

import { useState, useCallback, useEffect } from 'react'

interface LineItem {
  id: string
  accountName: string
  sourceType: string
  reportedAmount: number | string
  actualAmount: number | string | null
  isChecked: boolean
  notes: string | null
  depositId: string
}

interface GroupedRunDate {
  date: string
  totalSales: number
  allocationBreakdown: Record<string, number> | null
}

interface GroupedRun {
  id: string
  managerName: string
  totalCashReceived: number | null
  runDate: string
  dates: GroupedRunDate[]
}

interface Report {
  id: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'LOCKED'
  isGrouped: boolean
  groupedRunId: string | null
  lockedAt: string | null
  lockerName: string | null
  groupedRun: GroupedRun | null
}

interface Props {
  businessId: string
  reportId: string
}

const toNum = (v: number | string | null | undefined) =>
  v === null || v === undefined ? 0 : Number(v)

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00Z')
  return `${DAY_NAMES[d.getUTCDay()]} ${dateStr.slice(5)}`
}

export function CashAllocationGroupedReport({ businessId, reportId }: Props) {
  const [report, setReport] = useState<Report | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [localAmounts, setLocalAmounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [locking, setLocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mismatches, setMismatches] = useState<string[]>([])
  const [confirmForceClose, setConfirmForceClose] = useState(false)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    fetch('/api/admin/pending-actions')
      .then(r => r.json())
      .then(d => setCanEdit(d.canApproveCashAlloc === true))
      .catch(() => setCanEdit(false))
  }, [])

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}?reportId=${reportId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      if (!data.exists) {
        setError('Grouped cash allocation report not found.')
        return
      }
      setReport(data.report)
      setLineItems(data.lineItems)
      const amounts: Record<string, string> = {}
      for (const li of data.lineItems as LineItem[]) {
        amounts[li.id] = li.actualAmount !== null ? String(li.actualAmount) : String(li.reportedAmount)
      }
      setLocalAmounts(amounts)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [businessId, reportId])

  useEffect(() => { loadReport() }, [loadReport])

  const updateItem = async (itemId: string, isChecked: boolean, actualAmount: string | null) => {
    const parsed = actualAmount !== null && actualAmount !== '' ? parseFloat(actualAmount) : null
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked, actualAmount: parsed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      setLineItems(prev => prev.map(li => li.id === itemId ? { ...li, ...data.item } : li))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const lockReport = async () => {
    if (!report) return
    setMismatches([])
    setLocking(true)
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}/${report.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.mismatches) setMismatches(data.mismatches)
        throw new Error(data.error ?? 'Failed to lock')
      }
      setReport(data.report)
      setLineItems(data.lineItems)
      window.dispatchEvent(new CustomEvent('pending-actions:refresh'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLocking(false)
    }
  }

  const forceCloseReport = async () => {
    if (!report) return
    setConfirmForceClose(false)
    setLocking(true)
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}/${report.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceClose: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to close')
      setReport(data.report)
      setLineItems(data.lineItems)
      window.dispatchEvent(new CustomEvent('pending-actions:refresh'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLocking(false)
    }
  }

  const isLocked = report?.status === 'LOCKED'
  const groupedRun = report?.groupedRun ?? null
  const dates = groupedRun?.dates ?? []
  const totalCashReceived = groupedRun?.totalCashReceived ?? null

  // Build per-account totals across all dates
  const accountTotals: Record<string, { perDay: Record<string, number>; total: number }> = {}
  for (const d of dates) {
    if (!d.allocationBreakdown) continue
    for (const [accountName, amount] of Object.entries(d.allocationBreakdown)) {
      if (!accountTotals[accountName]) accountTotals[accountName] = { perDay: {}, total: 0 }
      accountTotals[accountName].perDay[d.date] = (accountTotals[accountName].perDay[d.date] ?? 0) + amount
      accountTotals[accountName].total += amount
    }
  }

  const totalAllocated = Object.values(accountTotals).reduce((s, a) => s + a.total, 0)
  const totalSales = dates.reduce((s, d) => s + (d.totalSales ?? 0), 0)
  // Variance = cash handed over vs total expected sales (not vs deposits to expense accounts)
  const variance = totalCashReceived !== null ? totalCashReceived - totalSales : null

  const nonRentItems = lineItems.filter(li => li.sourceType !== 'EOD_RENT_TRANSFER')
  const allConfirmed = nonRentItems.length > 0 && nonRentItems.every(li => li.isChecked && li.actualAmount !== null)

  if (loading) {
    return <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Loading grouped cash allocation…</div>
  }

  return (
    <div className="space-y-6">

      {/* Header info */}
      {groupedRun && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              Grouped EOD Catch-Up — {dates.length} day{dates.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {dates.map(d => dayLabel(d.date)).join(', ')}
            </span>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            Manager: <strong>{groupedRun.managerName}</strong>
            {totalCashReceived !== null && (
              <> · Cash handed over: <strong className="font-mono">${totalCashReceived.toFixed(2)}</strong></>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {mismatches.length > 0 && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-3 space-y-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Please resolve before locking:</p>
          {mismatches.map((m, i) => (
            <p key={i} className="text-sm text-amber-700 dark:text-amber-300">• {m}</p>
          ))}
        </div>
      )}

      {isLocked && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
          <span className="font-semibold">🔒 Report Locked</span>
          {report?.lockedAt && (
            <span className="text-gray-500 dark:text-gray-400">
              — {new Date(report.lockedAt).toLocaleString()}
              {report.lockerName && ` · by ${report.lockerName}`}
            </span>
          )}
        </div>
      )}

      {/* Cumulative allocation table with per-day columns */}
      {dates.length > 0 && Object.keys(accountTotals).length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Allocation Breakdown by Day</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
            <thead className="bg-white dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400 uppercase text-xs">Destination</th>
                {dates.map(d => (
                  <th key={d.date} className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400 uppercase text-xs whitespace-nowrap">
                    {dayLabel(d.date)}
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-200 uppercase text-xs">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
              {Object.entries(accountTotals).map(([accountName, { perDay, total }]) => (
                <tr key={accountName}>
                  <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">{accountName}</td>
                  {dates.map(d => (
                    <td key={d.date} className="px-3 py-2 text-right font-mono text-gray-600 dark:text-gray-400">
                      {perDay[d.date] ? `$${perDay[d.date].toFixed(2)}` : '—'}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">
                    ${total.toFixed(2)}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">Total Allocated</td>
                {dates.map(d => {
                  const dayTotal = Object.values(accountTotals).reduce((s, a) => s + (a.perDay[d.date] ?? 0), 0)
                  return (
                    <td key={d.date} className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                      ${dayTotal.toFixed(2)}
                    </td>
                  )
                })}
                <td className="px-4 py-2 text-right font-mono text-gray-900 dark:text-gray-100">${totalAllocated.toFixed(2)}</td>
              </tr>
              {/* Cash received row */}
              {totalCashReceived !== null && (
                <tr className="bg-blue-50 dark:bg-blue-900/20">
                  <td colSpan={dates.length + 1} className="px-4 py-2 text-sm text-blue-700 dark:text-blue-300 font-medium">
                    💵 Cash Received from Manager
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-blue-700 dark:text-blue-300">
                    ${totalCashReceived.toFixed(2)}
                  </td>
                </tr>
              )}
              {/* Total sales row */}
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                <td colSpan={dates.length + 1} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                  📊 Total Expected Sales
                </td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-gray-600 dark:text-gray-400">
                  ${totalSales.toFixed(2)}
                </td>
              </tr>
              {/* Variance row */}
              {variance !== null && (
                <tr className={Math.abs(variance) < 0.01
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-amber-50 dark:bg-amber-900/20'
                }>
                  <td colSpan={dates.length + 1} className={`px-4 py-2 text-sm font-medium ${
                    Math.abs(variance) < 0.01
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {Math.abs(variance) < 0.01 ? '✅ Variance' : '⚠ Variance (warning only — does not block)'}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono font-semibold ${
                    Math.abs(variance) < 0.01
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {variance >= 0 ? '+' : ''}{variance.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View-only banner */}
      {!canEdit && !isLocked && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          👁️ <span className="font-semibold">View only</span> — you do not have permission to confirm or lock this report.
        </div>
      )}

      {/* Line items — cashier confirms each deposit */}
      {nonRentItems.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Confirm Deposits</h3>
            {!isLocked && !allConfirmed && canEdit && (
              <button
                onClick={() => {
                  nonRentItems.filter(li => !li.isChecked).forEach(li => {
                    const amt = localAmounts[li.id] || String(toNum(li.reportedAmount))
                    setLocalAmounts(prev => ({ ...prev, [li.id]: amt }))
                    updateItem(li.id, true, amt)
                  })
                }}
                className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
              >
                ✅ Confirm all
              </button>
            )}
          </div>
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
            <thead className="bg-white dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Account</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Expected</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actual</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Done</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
              {nonRentItems.map(li => (
                <tr key={li.id} className={li.isChecked ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                  <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">{li.accountName}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-600 dark:text-gray-400">
                    ${toNum(li.reportedAmount).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isLocked || !canEdit ? (
                      <span className="font-mono text-gray-700 dark:text-gray-300">
                        ${toNum(li.actualAmount ?? li.reportedAmount).toFixed(2)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        value={localAmounts[li.id] ?? ''}
                        onChange={e => setLocalAmounts(prev => ({ ...prev, [li.id]: e.target.value }))}
                        onBlur={e => {
                          if (li.isChecked) updateItem(li.id, true, e.target.value)
                        }}
                        className="w-28 border rounded px-2 py-1 text-sm text-right font-mono
                          border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700
                          text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {isLocked ? (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={li.isChecked}
                        disabled={!canEdit}
                        onChange={e => {
                          if (!canEdit) return
                          const amt = localAmounts[li.id] ?? String(toNum(li.reportedAmount))
                          updateItem(li.id, e.target.checked, amt)
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    )}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">Total</td>
                <td className="px-4 py-2 text-right font-mono text-gray-900 dark:text-gray-100">
                  ${nonRentItems.reduce((sum, li) => sum + toNum(li.reportedAmount), 0).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-gray-900 dark:text-gray-100">
                  ${nonRentItems.reduce((sum, li) => sum + toNum(li.actualAmount ?? li.reportedAmount), 0).toFixed(2)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Lock / Close buttons */}
      {!isLocked && canEdit && (
        <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
          {/* Close Without Deductions */}
          <div>
            {confirmForceClose ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  All cash goes to cashbox — no deductions. Confirm?
                </span>
                <button
                  onClick={forceCloseReport}
                  disabled={locking}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded"
                >
                  Yes, Close
                </button>
                <button
                  onClick={() => setConfirmForceClose(false)}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmForceClose(true)}
                disabled={locking}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded-md"
              >
                Close Without Deductions
              </button>
            )}
          </div>
          {allConfirmed && (
            <button
              onClick={lockReport}
              disabled={locking}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                text-white text-sm font-semibold rounded-md"
            >
              {locking ? 'Locking…' : `🔒 Confirm & Lock All ${dates.length} Day${dates.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
