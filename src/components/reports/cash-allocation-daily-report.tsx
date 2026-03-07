'use client'

import { useState, useCallback } from 'react'

interface LineItem {
  id: string
  accountName: string
  sourceType: string
  reportedAmount: number | string
  actualAmount: number | string | null
  isChecked: boolean
  notes: string | null
}

interface Report {
  id: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'LOCKED'
  reportDate: string
  lockedAt: string | null
  lockedBy: string | null
  notes: string | null
}

interface Props {
  businessId: string
}

const toNum = (v: number | string | null | undefined) =>
  v === null || v === undefined ? 0 : Number(v)

export function CashAllocationDailyReport({ businessId }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [report, setReport] = useState<Report | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [allChecked, setAllChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locking, setLocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mismatches, setMismatches] = useState<string[]>([])
  // local edits: itemId → actualAmount string
  const [localAmounts, setLocalAmounts] = useState<Record<string, string>>({})

  const isLocked = report?.status === 'LOCKED'

  const loadReport = useCallback(async (d: string) => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}?date=${d}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      if (data.exists) {
        setReport(data.report)
        setLineItems(data.lineItems)
        setAllChecked(data.allChecked)
        // Seed local amounts from saved values
        const amounts: Record<string, string> = {}
        for (const li of data.lineItems as LineItem[]) {
          amounts[li.id] = li.actualAmount !== null ? String(li.actualAmount) : ''
        }
        setLocalAmounts(amounts)
      } else {
        setReport(null)
        setLineItems([])
        setAllChecked(false)
        setLocalAmounts({})
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  const generate = async () => {
    setError(null)
    setMismatches([])
    setLoading(true)
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate')
      setReport(data.report)
      setLineItems(data.lineItems)
      setAllChecked(data.allChecked)
      const amounts: Record<string, string> = {}
      for (const li of data.lineItems as LineItem[]) {
        amounts[li.id] = li.actualAmount !== null ? String(li.actualAmount) : ''
      }
      setLocalAmounts(amounts)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const updateItem = async (itemId: string, isChecked: boolean, actualAmount: string | null, notes?: string) => {
    const parsed = actualAmount !== null && actualAmount !== '' ? parseFloat(actualAmount) : null
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked, actualAmount: parsed, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      setLineItems(prev => prev.map(li => li.id === itemId ? { ...li, ...data.item } : li))
      setAllChecked(data.allChecked)
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLocking(false)
    }
  }

  const sourceLabel = (t: string) =>
    t === 'EOD_RENT_TRANSFER' ? 'Rent Transfer' :
    t === 'AUTO_DEPOSIT' ? 'Auto Deposit' : t

  const totalReported = lineItems.reduce((s, li) => s + toNum(li.reportedAmount), 0)
  const totalActual = lineItems.reduce((s, li) => s + toNum(localAmounts[li.id] !== undefined && localAmounts[li.id] !== '' ? parseFloat(localAmounts[li.id]) : li.actualAmount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Report Date
          </label>
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => {
              setDate(e.target.value)
              setReport(null)
              setLineItems([])
              setError(null)
            }}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={generate}
          disabled={loading || isLocked}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading…' : report ? 'Refresh Report' : 'Generate Report'}
        </button>
        {!report && !loading && (
          <button
            onClick={() => loadReport(date)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Load Existing
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {isLocked && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <span className="font-semibold">🔒 Report Locked</span>
          <span className="text-gray-500 dark:text-gray-400">— read-only</span>
        </div>
      )}

      {report && lineItems.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No EOD deposits found for {date}. Run EOD reports first, then generate this report.
        </p>
      )}

      {lineItems.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reported $</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Done</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actual $</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {lineItems.map(item => {
                const localAmt = localAmounts[item.id] ?? (item.actualAmount !== null ? String(item.actualAmount) : '')
                const parsedActual = localAmt !== '' ? parseFloat(localAmt) : null
                const reported = toNum(item.reportedAmount)
                const matches = parsedActual !== null && Math.abs(parsedActual - reported) <= 0.009
                const mismatch = parsedActual !== null && !matches

                return (
                  <tr key={item.id} className={item.isChecked ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.accountName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {sourceLabel(item.sourceType)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-900 dark:text-gray-100">
                      ${reported.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.isChecked}
                        disabled={isLocked}
                        onChange={e => {
                          const checked = e.target.checked
                          updateItem(item.id, checked, localAmt || null)
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isLocked ? (
                        <span className={`text-sm font-mono ${matches ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                          {parsedActual !== null ? `$${parsedActual.toFixed(2)}` : '—'}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={localAmt}
                          onChange={e => setLocalAmounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                          onBlur={() => {
                            if (localAmt !== (item.actualAmount !== null ? String(item.actualAmount) : '')) {
                              updateItem(item.id, item.isChecked, localAmt || null)
                            }
                          }}
                          placeholder={reported.toFixed(2)}
                          className={`w-28 border rounded px-2 py-1 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100
                            ${mismatch ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600' : ''}
                            ${matches ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : ''}
                            ${!mismatch && !matches ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700' : ''}
                          `}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {item.notes ?? ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Total
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">
                  ${totalReported.toFixed(2)}
                </td>
                <td />
                <td className="px-4 py-3 text-right text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">
                  ${totalActual.toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {mismatches.length > 0 && (
        <ul className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 p-3 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          {mismatches.map((m, i) => <li key={i}>⚠ {m}</li>)}
        </ul>
      )}

      {report && !isLocked && allChecked && (
        <div className="flex justify-end">
          <button
            onClick={lockReport}
            disabled={locking}
            className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {locking ? 'Locking…' : '🔒 Lock Report for ' + date}
          </button>
        </div>
      )}
    </div>
  )
}
