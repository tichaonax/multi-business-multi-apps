'use client'

import { useState, useEffect } from 'react'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface AccountBalanceCardProps {
  accountData: any
  onRefresh?: () => void
  canViewExpenseReports?: boolean
  canEditThreshold?: boolean
  isAdmin?: boolean
}

export function AccountBalanceCard({ accountData, onRefresh, canViewExpenseReports = false, canEditThreshold = false, isAdmin = false }: AccountBalanceCardProps) {
  const customAlert = useAlert()
  const confirm = useConfirm()
  const [balanceSummary, setBalanceSummary] = useState<any>(null)
  const [balanceForbidden, setBalanceForbidden] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingThreshold, setEditingThreshold] = useState(false)
  const [thresholdInput, setThresholdInput] = useState('')
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    if (accountData?.id) {
      fetchBalanceSummary()
    }
  }, [accountData])

  const fetchBalanceSummary = async () => {
    if (!accountData?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/expense-account/${accountData.id}/balance`, {
        credentials: 'include',
      })

      if (response.status === 403) {
        setBalanceForbidden(true)
      } else if (response.ok) {
        const data = await response.json()
        setBalanceSummary(data.data)
      }
    } catch (error) {
      console.error('Error fetching balance summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveThreshold = async () => {
    const value = parseFloat(thresholdInput)
    if (isNaN(value) || value < 0) {
      customAlert({ title: 'Invalid value', description: 'Threshold must be a non-negative number.' })
      return
    }
    setSavingThreshold(true)
    try {
      const res = await fetch(`/api/expense-account/${accountData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lowBalanceThreshold: value }),
      })
      if (!res.ok) {
        const data = await res.json()
        customAlert({ title: 'Error', description: data.error || 'Failed to update threshold.' })
      } else {
        setEditingThreshold(false)
        if (onRefresh) onRefresh()
      }
    } catch {
      customAlert({ title: 'Error', description: 'Network error. Please try again.' })
    } finally {
      setSavingThreshold(false)
    }
  }

  const openAdjustModal = () => {
    setAdjustTarget(String(balance))
    setAdjustReason('')
    setShowAdjustModal(true)
  }

  const handleAdjustBalance = async () => {
    const target = parseFloat(adjustTarget)
    if (isNaN(target)) {
      customAlert({ title: 'Invalid value', description: 'Enter a valid balance amount.' })
      return
    }
    if (!adjustReason.trim()) {
      customAlert({ title: 'Reason required', description: 'Explain why this balance is being corrected (e.g. reconciled against a bank statement).' })
      return
    }

    const confirmed = await confirm({
      title: 'Adjust Account Balance?',
      description: `This changes the balance from ${formatCurrency(balance)} to ${formatCurrency(target)} by posting an audited correction entry. This cannot be undone automatically — only with another correction.`,
      confirmText: 'Adjust Balance',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    setAdjusting(true)
    try {
      const res = await fetch(`/api/expense-account/${accountData.id}/adjust-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetBalance: target, reason: adjustReason.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setShowAdjustModal(false)
        fetchBalanceSummary()
        if (onRefresh) onRefresh()
      } else {
        customAlert({ title: 'Error', description: data.error || data.message || 'Failed to adjust balance.' })
      }
    } catch {
      customAlert({ title: 'Error', description: 'Network error. Please try again.' })
    } finally {
      setAdjusting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (!accountData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <p className="text-gray-500 dark:text-gray-400">No account data available</p>
      </div>
    )
  }

  const balance = Number(accountData.balance || 0)
  const threshold = Number(accountData.lowBalanceThreshold || 500)
  const criticalThreshold = threshold * 0.5

  const isCriticalBalance = balance < criticalThreshold
  const isLowBalance = balance < threshold && !isCriticalBalance

  const cardGradient = isCriticalBalance
    ? 'from-red-500 to-red-600'
    : isLowBalance
    ? 'from-amber-700 to-amber-800'
    : accountData.isSibling
    ? 'from-purple-600 to-purple-700'
    : 'from-green-600 to-green-700'

  if (balanceForbidden) {
    return (
      <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg shadow text-white px-4 py-3 flex items-center gap-3">
        <span className="text-xl">🔒</span>
        <div>
          <p className="text-sm font-semibold">Balance not visible</p>
          <p className="text-xs opacity-70">You have restricted access to this account</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-r ${cardGradient} rounded-lg shadow text-white`}>
      {/* ── Compact single-row summary ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">

        {/* Balance */}
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="text-xl font-bold tracking-tight">{formatCurrency(balance)}</span>
          {isCriticalBalance && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-white/20 border border-white/40 whitespace-nowrap">
              ⚠️ Critical
            </span>
          )}
          {isLowBalance && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-white/20 border border-white/40 whitespace-nowrap">
              ⚡ Low
            </span>
          )}
          {isAdmin && (
            <button
              onClick={openAdjustModal}
              className="opacity-50 hover:opacity-100 transition-opacity leading-none text-sm"
              title="Manually correct this balance (admin only)"
            >✏️</button>
          )}
        </div>

        <div className="w-px h-5 bg-white/30 hidden sm:block shrink-0" />

        {/* Deposits stat */}
        {balanceSummary ? (
          <div className="flex items-center gap-1.5 text-xs shrink-0">
            <span className="opacity-70">Deposits</span>
            <span className="font-semibold">{formatCurrency(balanceSummary.totalDeposits || 0)}</span>
            {canViewExpenseReports ? (
              <a
                href={`/expense-accounts/${accountData.id}/deposits`}
                onClick={(e) => e.stopPropagation()}
                className="opacity-70 hover:opacity-100 hover:underline"
                aria-label={`Open deposits for ${accountData.accountName}`}
              >
                ({balanceSummary.depositCount || 0})
              </a>
            ) : (
              <span className="opacity-70">({balanceSummary.depositCount || 0})</span>
            )}
          </div>
        ) : (
          <div className="text-xs opacity-60 shrink-0">
            {loading ? 'Loading…' : 'Deposits —'}
          </div>
        )}

        <div className="w-px h-5 bg-white/30 hidden sm:block shrink-0" />

        {/* Payments stat */}
        {balanceSummary ? (
          <div className="flex items-center gap-1.5 text-xs shrink-0">
            <span className="opacity-70">Payments</span>
            <span className="font-semibold">{formatCurrency(balanceSummary.totalPayments || 0)}</span>
            <span className="opacity-70">({balanceSummary.paymentCount || 0})</span>
          </div>
        ) : null}

        {/* Draft badge — only when drafts exist */}
        {balanceSummary?.draftPaymentCount > 0 && (
          <>
            <div className="w-px h-5 bg-white/30 hidden sm:block shrink-0" />
            <div className="flex items-center gap-1 text-xs shrink-0 bg-white/15 border border-white/30 rounded-full px-2 py-0.5">
              <span>📝</span>
              <span className="font-semibold">{balanceSummary.draftPaymentCount} draft{balanceSummary.draftPaymentCount !== 1 ? 's' : ''}</span>
              <span className="opacity-70">· {formatCurrency(balanceSummary.draftPaymentTotal || 0)}</span>
            </div>
          </>
        )}

        {/* Spacer pushes status + refresh to the right */}
        <div className="flex-1" />

        {/* Status + threshold */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1 opacity-75">
            <div className={`w-1.5 h-1.5 rounded-full ${accountData.isActive ? 'bg-white' : 'bg-gray-400'}`} />
            <span>{accountData.isActive ? 'Active' : 'Inactive'}</span>
          </div>
          <span className="opacity-40">·</span>
          {editingThreshold ? (
            <div className="flex items-center gap-1">
              <span className="opacity-75">Alert $</span>
              <input
                type="number"
                min="0"
                step="1"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveThreshold(); if (e.key === 'Escape') setEditingThreshold(false) }}
                autoFocus
                className="w-16 px-1 py-0.5 text-xs rounded bg-white/20 border border-white/40 text-white placeholder-white/50 focus:outline-none"
              />
              <button
                onClick={handleSaveThreshold}
                disabled={savingThreshold}
                className="text-xs px-1 py-0.5 rounded bg-white/20 hover:bg-white/30 disabled:opacity-50"
                title="Save"
              >✓</button>
              <button
                onClick={() => setEditingThreshold(false)}
                className="text-xs px-1 py-0.5 rounded bg-white/20 hover:bg-white/30"
                title="Cancel"
              >✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="opacity-75">Alert: {formatCurrency(threshold)}</span>
              {canEditThreshold && (
                <button
                  onClick={() => { setThresholdInput(String(threshold)); setEditingThreshold(true) }}
                  className="opacity-50 hover:opacity-100 transition-opacity leading-none"
                  title="Edit balance alert threshold"
                >✏️</button>
              )}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={() => { fetchBalanceSummary(); if (onRefresh) onRefresh() }}
          disabled={loading}
          className="p-1 hover:bg-white/20 rounded transition-colors disabled:opacity-50 shrink-0"
          title="Refresh balance"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Adjust Balance Modal (admin only) */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Adjust Account Balance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Current balance: <span className="font-semibold">{formatCurrency(balance)}</span>. This posts an
              audited correction entry — it does not overwrite history.
            </p>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correct Balance</label>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                value={adjustTarget}
                onChange={(e) => setAdjustTarget(e.target.value)}
                autoFocus
                className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary"
              />
            </div>
            {balanceSummary && (
              <button
                type="button"
                onClick={() => setAdjustTarget(String(balanceSummary.calculatedBalance))}
                className="mb-3 text-xs font-medium text-primary hover:underline"
              >
                Match Current Contribution Balance ({formatCurrency(balanceSummary.calculatedBalance)})
              </button>
            )}

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (required)</label>
            <textarea
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              rows={3}
              placeholder="e.g. Reconciled against landlord statement — balance was missing a deposit from before the backup restore."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                disabled={adjusting}
                className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdjustBalance}
                disabled={adjusting || !adjustTarget || !adjustReason.trim()}
                className="px-3 py-1.5 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {adjusting ? 'Adjusting…' : 'Adjust Balance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
