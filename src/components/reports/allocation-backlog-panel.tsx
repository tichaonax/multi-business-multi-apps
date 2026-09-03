'use client'

import { useCallback, useEffect, useState } from 'react'

interface BacklogGroup {
  allocationType: 'RENT' | 'AUTO_DEPOSIT' | 'PAYROLL'
  configKey: string
  accountName: string
  totalOwed: number
  daysCount: number
  oldestDate: string
  newestDate: string
}

interface Props {
  businessId: string
  canManage: boolean
  onCaughtUp?: () => void // notify the parent (e.g. to refresh its own cash-bucket balance display)
}

const typeLabel = (t: BacklogGroup['allocationType']) =>
  t === 'RENT' ? '🏠 Rent' : t === 'PAYROLL' ? '💼 Payroll' : '🏦 Auto Deposit'

/**
 * Shows any backlog of skipped EOD allocations (rent, loan/expense auto-deposits, payroll
 * contribution) for a business — days where processRentTransfer / processAutoDeposits /
 * computeAndExecutePayrollContribution (eod-utils.ts, payroll-eod-contribution.ts) skipped
 * the transfer for lack of real available cash. Lets an admin manually catch up on that
 * backlog once cash becomes available, instead of it silently vanishing forever.
 */
export function AllocationBacklogPanel({ businessId, canManage, onCaughtUp }: Props) {
  const [backlog, setBacklog] = useState<BacklogGroup[]>([])
  const [availableCashNow, setAvailableCashNow] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [catchingUp, setCatchingUp] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/business/${businessId}/allocation-backlog`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setBacklog(data.backlog ?? [])
        setAvailableCashNow(Number(data.availableCashNow ?? 0))
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [businessId])

  useEffect(() => { load() }, [load])

  const catchUp = async (group: BacklogGroup) => {
    setError(null)
    setMessage(null)
    setCatchingUp(`${group.allocationType}:${group.configKey}`)
    try {
      const res = await fetch(`/api/business/${businessId}/allocation-backlog/catch-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocationType: group.allocationType, configKey: group.configKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to catch up')
      setMessage(`${group.accountName}: ${data.message}`)
      await load()
      onCaughtUp?.()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to catch up')
    } finally {
      setCatchingUp(null)
    }
  }

  if (loading || backlog.length === 0) return null

  const totalBacklog = backlog.reduce((s, g) => s + g.totalOwed, 0)

  return (
    <div className="rounded-lg border border-red-300 dark:border-red-700 overflow-hidden">
      <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-b border-red-200 dark:border-red-800 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
          ⚠ Allocation Backlog — ${totalBacklog.toFixed(2)} owed
        </h3>
        <span className="text-xs text-red-600 dark:text-red-400">
          🪣 Available now: ${availableCashNow.toFixed(2)}
        </span>
      </div>
      <div className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
        {error && (
          <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">{error}</div>
        )}
        {message && (
          <div className="px-4 py-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20">{message}</div>
        )}
        {backlog.map(group => {
          const key = `${group.allocationType}:${group.configKey}`
          return (
            <div key={key} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {typeLabel(group.allocationType)} — {group.accountName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {group.daysCount} day{group.daysCount !== 1 ? 's' : ''} missed
                  {group.oldestDate === group.newestDate ? ` (${group.oldestDate})` : ` (${group.oldestDate} → ${group.newestDate})`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-semibold text-red-700 dark:text-red-300">
                  ${group.totalOwed.toFixed(2)}
                </span>
                {canManage && (
                  <button
                    onClick={() => catchUp(group)}
                    disabled={catchingUp !== null || availableCashNow <= 0.009}
                    title={availableCashNow <= 0.009 ? 'No cash currently available to catch up' : undefined}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-md"
                  >
                    {catchingUp === key ? 'Catching up…' : 'Catch Up Now'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
