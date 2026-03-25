'use client'

import { useState, useEffect, useCallback } from 'react'
import type { EodPreviewConfig, EodRentTransferPreview, EodPayrollContributionPreview } from '@/app/api/auto-deposits/[businessId]/eod-preview/route'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ConfirmedEntry {
  configId: string
  expenseAccountId: string
  amount: number
  skip: boolean
  isRentAccount: boolean
}

interface EntryState {
  configId: string
  expenseAccountId: string
  accountName: string
  dailyAmount: number
  overrideAmount: number
  isIncluded: boolean
  isRent: boolean
  rentMinimum: number | null
  isDisabled: boolean       // frozen / expired / before-start — cannot include
  alreadyDoneToday: boolean
  amountError: string | null
}

interface Props {
  businessId: string
  eodDate: string            // YYYY-MM-DD
  todayNetSales?: number     // optional — passed from caller if available; else fetched
  onConfirm: (entries: ConfirmedEntry[]) => void
  onSkipAll: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function buildEntryState(config: EodPreviewConfig): EntryState {
  const isDisabled =
    config.isAutoDepositFrozen ||
    (!!config.startDate && config.startDate > config.endDate! /* handled below */) ||
    false

  // Disabled = frozen; cap-paused pre-unchecked but user can re-enable
  const isLocked = config.isAutoDepositFrozen
    || (!!config.startDate && false)   // placeholder — expiry evaluated in row-level logic
  const isCapPaused = config.isPausedByCap && !config.isAutoDepositFrozen

  // Default inclusion
  let isIncluded = true
  if (config.alreadyProcessedToday) isIncluded = false
  else if (config.isAutoDepositFrozen) isIncluded = false
  else if (isCapPaused) isIncluded = false

  return {
    configId: config.configId,
    expenseAccountId: config.expenseAccountId,
    accountName: config.accountName,
    dailyAmount: config.dailyAmount,
    overrideAmount: config.dailyAmount,
    isIncluded,
    isRent: config.isRentAccount,
    rentMinimum: config.rentMinimum,
    isDisabled: config.isAutoDepositFrozen || config.alreadyProcessedToday,
    alreadyDoneToday: config.alreadyProcessedToday,
    amountError: null,
  }
}

function rowDisabled(config: EodPreviewConfig) {
  return config.isAutoDepositFrozen || config.alreadyProcessedToday
}

function rowCanReEnable(config: EodPreviewConfig) {
  return config.isPausedByCap && !config.isAutoDepositFrozen && !config.alreadyProcessedToday
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AutoDepositEodSummary({ businessId, eodDate, todayNetSales: propNetSales, onConfirm, onSkipAll }: Props) {
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [depositAccountBalance, setDepositAccountBalance] = useState(0)
  const [netSales, setNetSales] = useState<number>(propNetSales ?? 0)
  const [configs, setConfigs] = useState<EodPreviewConfig[]>([])
  const [entries, setEntries] = useState<EntryState[]>([])
  const [showSkipRentConfirm, setShowSkipRentConfirm] = useState(false)
  const [rentTransfer, setRentTransfer] = useState<EodRentTransferPreview | null>(null)
  const [payrollContribution, setPayrollContribution] = useState<EodPayrollContributionPreview | null>(null)

  // ── Fetch preview on mount ─────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true)
      setFetchError(false)
      try {
        const res = await fetch(
          `/api/auto-deposits/${businessId}/eod-preview?date=${eodDate}`
        )
        if (!res.ok) throw new Error('fetch failed')
        const json = await res.json()
        const data = json.data
        setDepositAccountBalance(data.depositAccountBalance)
        if (propNetSales === undefined) setNetSales(data.todayNetSales)
        setConfigs(data.configs)
        setRentTransfer(data.rentTransfer ?? null)
        setPayrollContribution(data.payrollContribution ?? null)

        // If nothing to do, skip immediately
        const actionable = (data.configs as EodPreviewConfig[]).filter(
          (c: EodPreviewConfig) => !c.alreadyProcessedToday
        )
        if (data.configs.length === 0 || actionable.length === 0) {
          onSkipAll()
          return
        }

        setEntries(data.configs.map(buildEntryState))
      } catch {
        setFetchError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, eodDate])

  // ── Computed values ────────────────────────────────────────────────────────

  const runningTotal = entries.reduce((sum, e) => {
    if (e.alreadyDoneToday) return sum
    if (e.isDisabled && !e.isRent) return sum
    if (!e.isIncluded) return sum
    return sum + e.overrideAmount
  }, 0)

  const hasRentEntry = entries.some(e => e.isRent && !e.alreadyDoneToday)

  const hasAmountError = entries.some(e => e.amountError !== null)

  const insufficientFunds = runningTotal > depositAccountBalance && runningTotal > 0
  const overSales = netSales > 0 && runningTotal > netSales
  const allSkipped = runningTotal === 0

  const confirmDisabled = (insufficientFunds && runningTotal > 0) || hasAmountError

  // ── Entry mutators ─────────────────────────────────────────────────────────

  const toggleIncluded = useCallback((configId: string) => {
    setEntries(prev => prev.map(e => {
      if (e.configId !== configId) return e
      const next = { ...e, isIncluded: !e.isIncluded }
      // Re-validate rent minimum when re-included
      if (next.isRent && next.rentMinimum !== null && next.isIncluded) {
        next.amountError = next.overrideAmount < next.rentMinimum
          ? `Min $${next.rentMinimum.toFixed(2)}`
          : null
      }
      return next
    }))
  }, [])

  const changeAmount = useCallback((configId: string, raw: string) => {
    const val = parseFloat(raw)
    setEntries(prev => prev.map(e => {
      if (e.configId !== configId) return e
      const amount = isNaN(val) ? e.overrideAmount : Math.max(0, val)
      let amountError: string | null = null
      if (e.isRent && e.rentMinimum !== null && e.isIncluded && amount < e.rentMinimum) {
        amountError = `Min $${e.rentMinimum.toFixed(2)}`
      }
      return { ...e, overrideAmount: amount, amountError }
    }))
  }, [])

  const skipAll = useCallback((includeRent: boolean) => {
    setEntries(prev => prev.map(e => {
      if (e.alreadyDoneToday) return e
      if (e.isRent && !includeRent) return e
      return { ...e, isIncluded: false, amountError: null }
    }))
  }, [])

  // ── Confirm handler ────────────────────────────────────────────────────────

  function handleConfirm() {
    const result: ConfirmedEntry[] = entries.map(e => ({
      configId: e.configId,
      expenseAccountId: e.expenseAccountId,
      amount: e.overrideAmount,
      skip: !e.isIncluded || e.alreadyDoneToday,
      isRentAccount: e.isRent,
    }))
    onConfirm(result)
  }

  function handleSkipAll() {
    if (hasRentEntry) {
      setShowSkipRentConfirm(true)
    } else {
      skipAll(false)
    }
  }

  function confirmSkipAllIncludingRent() {
    skipAll(true)
    setShowSkipRentConfirm(false)
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  function rowBg(config: EodPreviewConfig, entry: EntryState) {
    if (config.alreadyProcessedToday) return 'bg-gray-50 dark:bg-gray-800/40 opacity-60'
    if (config.isAutoDepositFrozen) return 'bg-red-50 dark:bg-red-900/20'
    if (config.isRentAccount) return 'bg-amber-50 dark:bg-amber-900/20'
    if (config.isPausedByCap) return 'bg-amber-50 dark:bg-amber-900/10'
    return 'bg-white dark:bg-gray-800'
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading auto-deposit preview…</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          ⚠ Could not load auto-deposit preview.
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
          Auto-deposits will be skipped today. You can still save the report.
        </p>
        <button
          onClick={onSkipAll}
          className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Continue without deposits
        </button>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          💰 End-of-Day Auto-Deposits
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Business balance: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(depositAccountBalance)}</span>
          {netSales > 0 && (
            <> &nbsp;|&nbsp; Today&apos;s sales: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(netSales)}</span></>
          )}
        </p>
      </div>

      {/* Guardrail banners */}
      {insufficientFunds && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-800 dark:text-red-200">
          ⛔ Insufficient balance — {formatCurrency(depositAccountBalance)} available but {formatCurrency(runningTotal)} selected.
          Uncheck entries or the deposits will be blocked.
        </div>
      )}
      {!insufficientFunds && overSales && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          ⚠ Total deposits ({formatCurrency(runningTotal)}) exceed today&apos;s sales ({formatCurrency(netSales)}).
          Verify amounts before continuing.
        </div>
      )}
      {allSkipped && !insufficientFunds && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-sm text-blue-700 dark:text-blue-300">
          ℹ No deposits will be made today. EOD will close without any auto-deposits.
        </div>
      )}

      {/* Skip-rent confirmation */}
      {showSkipRentConfirm && (
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/30 p-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
            Rent savings will not be set aside today. Are you sure?
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmSkipAllIncludingRent}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium transition-colors"
            >
              Yes, skip all including rent
            </button>
            <button
              onClick={() => setShowSkipRentConfirm(false)}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account</th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">Amount ($)</th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">Include</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {/* Payroll auto-contribution — separate process, read-only info row */}
            {payrollContribution && (
              <tr className={payrollContribution.skipped ? 'bg-gray-50 dark:bg-gray-800/40 opacity-70' : 'bg-blue-50 dark:bg-blue-900/20'}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span>💼</span>
                    <span className={`font-medium ${payrollContribution.skipped ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                      Payroll Account
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${payrollContribution.skipped ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400'}`}>
                    {payrollContribution.skipped ? `⚠ Skipped — ${payrollContribution.reason}` : payrollContribution.reason}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={`font-medium text-sm ${payrollContribution.skipped ? 'text-gray-400 dark:text-gray-500' : 'text-blue-700 dark:text-blue-300'}`}>
                    {payrollContribution.skipped ? '—' : formatCurrency(payrollContribution.amount)}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">🔒 auto</span>
                </td>
              </tr>
            )}

            {/* Rent transfer — separate process, read-only info row */}
            {rentTransfer && (
              <tr className={rentTransfer.alreadyProcessedToday ? 'bg-gray-50 dark:bg-gray-800/40 opacity-60' : 'bg-orange-50 dark:bg-orange-900/20'}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span>🏠</span>
                    <span className={`font-medium ${rentTransfer.alreadyProcessedToday ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                      {rentTransfer.accountName}
                    </span>
                  </div>
                  {rentTransfer.alreadyProcessedToday
                    ? <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Done today</span>
                    : <span className="text-xs text-orange-600 dark:text-orange-400">Separate rent process — runs automatically</span>
                  }
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={`font-medium text-sm ${rentTransfer.alreadyProcessedToday ? 'text-gray-400 dark:text-gray-500' : 'text-orange-700 dark:text-orange-300'}`}>
                    {formatCurrency(rentTransfer.dailyAmount)}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium whitespace-nowrap">🔒 auto</span>
                </td>
              </tr>
            )}
            {configs.map((config, i) => {
              const entry = entries[i]
              if (!entry) return null
              const disabled = rowDisabled(config)
              const canReEnable = rowCanReEnable(config)

              return (
                <tr key={config.configId} className={rowBg(config, entry)}>
                  {/* Account name */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {config.isRentAccount && <span title="Rent account">🏠</span>}
                      {config.isAutoDepositFrozen && <span title="Frozen">🔒</span>}
                      {config.isPausedByCap && !config.isAutoDepositFrozen && <span title="Cap reached">⛔</span>}
                      <span className={`font-medium ${config.alreadyProcessedToday ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                        {config.accountName}
                      </span>
                    </div>
                    {config.alreadyProcessedToday && (
                      <span className="ml-0.5 text-xs text-green-600 dark:text-green-400 font-medium">✓ Done today</span>
                    )}
                    {config.skipReason && !config.alreadyProcessedToday && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{config.skipReason}</p>
                    )}
                    {entry.amountError && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{entry.amountError}</p>
                    )}
                  </td>

                  {/* Amount input */}
                  <td className="px-3 py-2 text-right">
                    {config.alreadyProcessedToday || config.isAutoDepositFrozen ? (
                      <span className="text-gray-400 dark:text-gray-500">
                        {formatCurrency(config.dailyAmount)}
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min={config.isRentAccount && config.rentMinimum != null ? config.rentMinimum : 0}
                            value={entry.overrideAmount}
                            disabled={!entry.isIncluded && !config.isRentAccount}
                            onChange={e => changeAmount(config.configId, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-right text-sm disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        {config.isRentAccount && config.rentMinimum != null && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">↑ min {formatCurrency(config.rentMinimum)}</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Include checkbox / badge */}
                  <td className="px-3 py-2 text-center">
                    {config.isRentAccount && !config.alreadyProcessedToday ? (
                      <span className="text-xs text-amber-700 dark:text-amber-300 font-medium whitespace-nowrap">🔒 always</span>
                    ) : config.alreadyProcessedToday || config.isAutoDepositFrozen ? (
                      <input
                        type="checkbox"
                        disabled
                        checked={false}
                        readOnly
                        className="h-4 w-4 rounded border-gray-300 opacity-40 cursor-not-allowed"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={entry.isIncluded}
                        onChange={() => toggleIncluded(config.configId)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Footer total */}
          <tfoot>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-600">
              <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">Total to deposit</td>
              <td className={`px-3 py-2 text-right font-bold ${insufficientFunds ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {formatCurrency(runningTotal)}
              </td>
              <td />
            </tr>
            {payrollContribution && !payrollContribution.skipped && (
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
                <td className="px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300">💼 + Payroll contribution (separate)</td>
                <td className="px-3 py-1.5 text-right text-xs font-medium text-blue-700 dark:text-blue-300">
                  {formatCurrency(payrollContribution.amount)}
                </td>
                <td />
              </tr>
            )}
            {rentTransfer && !rentTransfer.alreadyProcessedToday && (
              <tr className="bg-orange-50 dark:bg-orange-900/20 border-t border-orange-200 dark:border-orange-800">
                <td className="px-3 py-1.5 text-xs text-orange-700 dark:text-orange-300">🏠 + Rent transfer (separate)</td>
                <td className="px-3 py-1.5 text-right text-xs font-medium text-orange-700 dark:text-orange-300">
                  {formatCurrency(rentTransfer.dailyAmount)}
                </td>
                <td />
              </tr>
            )}
            {(rentTransfer && !rentTransfer.alreadyProcessedToday || payrollContribution && !payrollContribution.skipped) && (
              <tr className="bg-orange-100 dark:bg-orange-900/30 border-t border-orange-300 dark:border-orange-700">
                <td className="px-3 py-2 text-sm font-bold text-orange-900 dark:text-orange-200">Total withdrawn from business</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-orange-900 dark:text-orange-200">
                  {formatCurrency(
                    runningTotal +
                    (rentTransfer && !rentTransfer.alreadyProcessedToday ? rentTransfer.dailyAmount : 0) +
                    (payrollContribution && !payrollContribution.skipped ? payrollContribution.amount : 0)
                  )}
                </td>
                <td />
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleSkipAll}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline transition-colors"
        >
          Skip All Deposits
        </button>

        <button
          onClick={handleConfirm}
          disabled={confirmDisabled}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
        >
          Continue to Save →
        </button>
      </div>
    </div>
  )
}
