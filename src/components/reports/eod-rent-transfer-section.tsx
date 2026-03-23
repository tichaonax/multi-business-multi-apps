'use client'

import { formatCurrency } from '@/lib/date-format'

interface EodRentTransferSectionProps {
  /** Daily transfer amount suggested (from config) */
  defaultAmount: number
  /** Monthly rent target */
  monthlyRent: number
  /** Current rent account balance before this transfer */
  currentBalance: number
  /** Whether to include this transfer when saving */
  included: boolean
  /** Transfer amount the user may override */
  amount: number
  /** Transfer already fired (idempotent guard already ran) */
  alreadyTransferred?: boolean
  /** Callback when user changes amount or inclusion toggle */
  onChange: (amount: number, included: boolean) => void
}

function indicatorColor(pct: number) {
  if (pct >= 100) return 'text-green-600 dark:text-green-400'
  if (pct >= 75) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

function progressBg(pct: number) {
  if (pct >= 100) return 'bg-green-500'
  if (pct >= 75) return 'bg-orange-400'
  return 'bg-red-500'
}

export function EodRentTransferSection({
  defaultAmount,
  monthlyRent,
  currentBalance,
  included,
  amount,
  alreadyTransferred = false,
  onChange,
}: EodRentTransferSectionProps) {
  const afterBalance = currentBalance + (included ? amount : 0)
  const currentPct = monthlyRent > 0 ? Math.min(100, Math.round((currentBalance / monthlyRent) * 100)) : 0
  const afterPct = monthlyRent > 0 ? Math.min(100, Math.round((afterBalance / monthlyRent) * 100)) : 0

  return (
    <div className={`mb-6 rounded-lg border-2 ${included ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30'} p-4`}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏠</span>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Rent Account Transfer</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Daily allocation to rent fund</p>
          </div>
        </div>
        {alreadyTransferred ? (
          <span className="text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded-full">
            ✅ Already transferred today
          </span>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-gray-600 dark:text-gray-400">{included ? 'Included' : 'Skip'}</span>
            <div
              onClick={() => onChange(amount, !included)}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${included ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${included ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </label>
        )}
      </div>

      {alreadyTransferred ? (
        /* Already done — just show the current balance */
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Current balance: <span className={`font-semibold ${indicatorColor(currentPct)}`}>{formatCurrency(currentBalance)}</span>
          {' '}({currentPct}% of monthly rent)
        </div>
      ) : (
        <>
          {/* Amount row */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-700 dark:text-gray-300 shrink-0">Transfer amount:</span>
            <div className="flex items-center gap-1 flex-1">
              <span className="text-sm text-gray-700 dark:text-gray-300">$</span>
              <input
                type="number"
                step="0.10"
                min="0"
                value={amount}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0, included)}
                disabled={!included}
                className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-right text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {amount !== defaultAmount && (
                <button
                  onClick={() => onChange(defaultAmount, included)}
                  className="text-xs text-blue-600 dark:text-blue-400 underline hover:no-underline"
                  title="Reset to suggested amount"
                >
                  reset
                </button>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              (suggested: {formatCurrency(defaultAmount)}/day)
            </span>
          </div>

          {/* Before / After progress bars */}
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                <span>Before transfer</span>
                <span className={indicatorColor(currentPct)}>{formatCurrency(currentBalance)} ({currentPct}%)</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${progressBg(currentPct)}`} style={{ width: `${currentPct}%` }} />
              </div>
            </div>
            {included && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                  <span>After transfer</span>
                  <span className={`font-semibold ${indicatorColor(afterPct)}`}>{formatCurrency(afterBalance)} ({afterPct}%)</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${progressBg(afterPct)}`} style={{ width: `${afterPct}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Monthly rent reference */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Monthly rent target: {formatCurrency(monthlyRent)}
          </p>
        </>
      )}
    </div>
  )
}
