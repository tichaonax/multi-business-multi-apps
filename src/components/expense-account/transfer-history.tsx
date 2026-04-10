'use client'

import { useState, useEffect, useCallback } from 'react'

interface TransferRecord {
  id: string
  transferDate: string
  amount: number
  notes: string
  sourceAccount: { id: string; accountName: string; accountNumber: string }
  destinationAccount: { id: string; accountName: string; accountNumber: string } | null
  initiatedBy: { id: string; name: string }
}

interface Aggregates {
  totalTransferredOut: number
  totalTransferredIn: number
  net: number
  count: number
}

interface TransferHistoryProps {
  accountId?: string       // if set, shows direction badge and pre-filters
  showFilters?: boolean    // true on standalone report page
}

const fmt = (n: number) => `$${Math.abs(n).toFixed(2)}`
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })

export function TransferHistory({ accountId, showFilters = false }: TransferHistoryProps) {
  const [transfers, setTransfers] = useState<TransferRecord[]>([])
  const [aggregates, setAggregates] = useState<Aggregates | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [direction, setDirection] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const limit = 50

  const load = useCallback(async (reset = false) => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (accountId) params.set('accountId', accountId)
    if (direction) params.set('direction', direction)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    params.set('limit', String(limit))
    params.set('offset', String(reset ? 0 : page * limit))

    try {
      const res = await fetch(`/api/expense-account/transfer-history?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setTransfers(reset ? json.data.transfers : prev => [...prev, ...json.data.transfers])
        setAggregates(json.data.aggregates)
        setHasMore(json.data.pagination.hasMore)
        if (reset) setPage(0)
      } else {
        setError(json.error || 'Failed to load transfers')
      }
    } catch {
      setError('Failed to load transfers')
    } finally {
      setLoading(false)
    }
  }, [accountId, direction, startDate, endDate, page])

  useEffect(() => {
    load(true)
  }, [accountId, direction, startDate, endDate])

  function directionBadge(t: TransferRecord) {
    if (!accountId) return null
    const isOut = t.sourceAccount.id === accountId
    return isOut
      ? <span className="px-1.5 py-0.5 text-xs rounded font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">▼ OUT</span>
      : <span className="px-1.5 py-0.5 text-xs rounded font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">▲ IN</span>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="input px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="input px-2 py-1 text-sm" />
          </div>
          {accountId && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Direction</label>
              <select value={direction} onChange={e => setDirection(e.target.value)} className="input px-2 py-1 text-sm">
                <option value="">All</option>
                <option value="OUT">Out only</option>
                <option value="IN">In only</option>
              </select>
            </div>
          )}
          {(startDate || endDate || direction) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); setDirection('') }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Summary bar */}
      {aggregates && aggregates.count > 0 && (
        <div className="flex flex-wrap gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
          {(!accountId || direction !== 'IN') && (
            <span className="text-red-600 dark:text-red-400">
              Total Out: <strong>{fmt(aggregates.totalTransferredOut)}</strong>
            </span>
          )}
          {(!accountId || direction !== 'OUT') && (
            <span className="text-green-600 dark:text-green-400">
              Total In: <strong>{fmt(aggregates.totalTransferredIn)}</strong>
            </span>
          )}
          {accountId && !direction && (
            <span className={`font-medium ${aggregates.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Net: {aggregates.net >= 0 ? '+' : '-'}{fmt(aggregates.net)}
            </span>
          )}
          <span className="text-gray-500 dark:text-gray-400 ml-auto">
            {aggregates.count} transfer{aggregates.count !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Table */}
      {loading && transfers.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      ) : transfers.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No transfers found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <th className="text-left py-2 px-3 font-medium">Date</th>
                {accountId && <th className="text-left py-2 px-3 font-medium">Dir</th>}
                <th className="text-right py-2 px-3 font-medium">Amount</th>
                <th className="text-left py-2 px-3 font-medium hidden md:table-cell">From</th>
                <th className="text-left py-2 px-3 font-medium hidden md:table-cell">To</th>
                <th className="text-left py-2 px-3 font-medium hidden lg:table-cell">Notes</th>
                <th className="text-left py-2 px-3 font-medium hidden lg:table-cell">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {transfers.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {fmtDate(t.transferDate)}
                  </td>
                  {accountId && (
                    <td className="py-2.5 px-3 whitespace-nowrap">{directionBadge(t)}</td>
                  )}
                  <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                    {fmt(t.amount)}
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {t.sourceAccount.accountName}
                    <span className="text-xs text-gray-400 ml-1">({t.sourceAccount.accountNumber})</span>
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {t.destinationAccount
                      ? <>{t.destinationAccount.accountName}<span className="text-xs text-gray-400 ml-1">({t.destinationAccount.accountNumber})</span></>
                      : <span className="text-gray-400 text-xs italic">Unknown</span>}
                  </td>
                  <td className="py-2.5 px-3 hidden lg:table-cell text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                    {t.notes || '—'}
                  </td>
                  <td className="py-2.5 px-3 hidden lg:table-cell text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {t.initiatedBy.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={() => { setPage(p => p + 1); load() }}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
