'use client'

import { useState, useEffect } from 'react'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface AccountBalanceCardProps {
  accountData: any
  onRefresh?: () => void
  canEditThreshold?: boolean
  isAdmin?: boolean
}

export function AccountBalanceCard({ accountData, onRefresh, canEditThreshold = false, isAdmin = false }: AccountBalanceCardProps) {
  const customAlert = useAlert()
  const confirm = useConfirm()
  const [balanceSummary, setBalanceSummary] = useState<any>(null)
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
      const response = await fetch('/api/payroll/account/balance', { credentials: 'include' })
      if (response.ok) {
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
      const res = await fetch('/api/payroll/account', {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const openAdjustModal = () => {
    setAdjustTarget(String(Number(accountData?.balance || 0)))
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
      customAlert({ title: 'Reason required', description: 'Explain why this balance is being corrected (e.g. reconciled against bank statement).' })
      return
    }

    const confirmed = await confirm({
      title: 'Adjust Payroll Account Balance?',
      description: `This changes the balance from ${formatCurrency(Number(accountData?.balance || 0))} to ${formatCurrency(target)} by posting an audited correction entry. This cannot be undone automatically — only with another correction.`,
      confirmText: 'Adjust Balance',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    setAdjusting(true)
    try {
      const res = await fetch('/api/payroll/account/adjust-balance', {
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

  if (!accountData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">No account data available</p>
      </div>
    )
  }

  const balance = Number(accountData.balance || 0)
  const threshold = Number(accountData.lowBalanceThreshold ?? 500)
  const criticalThreshold = threshold * 0.5

  const isCriticalBalance = balance < criticalThreshold
  const isLowBalance = balance < threshold && !isCriticalBalance

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-medium opacity-90">Payroll Account</h2>
          <p className="text-xs opacity-75">{accountData.accountNumber}</p>
        </div>
        <button
          onClick={() => {
            fetchBalanceSummary()
            if (onRefresh) onRefresh()
          }}
          disabled={loading}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh balance"
        >
          <svg
            className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Main Balance */}
      <div className="mb-6">
        <p className="text-sm font-medium opacity-90 mb-1">Current Balance</p>
        <div className="flex items-center gap-2">
          <p className="text-4xl font-bold">{formatCurrency(balance)}</p>
          {isAdmin && (
            <button
              onClick={openAdjustModal}
              className="opacity-50 hover:opacity-100 transition-opacity leading-none text-lg"
              title="Manually correct this balance (admin only)"
            >✏️</button>
          )}
        </div>
      </div>

      {/* Balance Alerts */}
      {isCriticalBalance && (
        <div className="bg-red-500/10 border border-red-300/50 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">Critical Balance Alert</p>
              <p className="text-xs opacity-90">
                Balance is below {formatCurrency(criticalThreshold)}. Please make a deposit soon to avoid payment delays.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLowBalance && (
        <div className="bg-yellow-500/10 border border-yellow-300/50 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <span className="text-xl">⚡</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">Low Balance Warning</p>
              <p className="text-xs opacity-90">
                Balance is below {formatCurrency(threshold)}. Consider making a deposit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alert Threshold Setting */}
      {canEditThreshold && (
        <div className="bg-white/10 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-75">Low Balance Alert Threshold</p>
              {!editingThreshold ? (
                <p className="text-sm font-medium">{formatCurrency(threshold)}</p>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm opacity-75">$</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveThreshold(); if (e.key === 'Escape') setEditingThreshold(false) }}
                    className="w-28 text-sm bg-white/20 border border-white/40 rounded px-2 py-0.5 text-white placeholder-white/50 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveThreshold}
                    disabled={savingThreshold}
                    className="text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded disabled:opacity-50"
                  >
                    {savingThreshold ? '…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingThreshold(false)}
                    className="text-xs opacity-75 hover:opacity-100"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <p className="text-[10px] opacity-60 mt-0.5">Critical alert at {formatCurrency(criticalThreshold)}</p>
            </div>
            {!editingThreshold && (
              <button
                onClick={() => { setThresholdInput(String(threshold)); setEditingThreshold(true) }}
                className="text-xs opacity-75 hover:opacity-100 underline"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Balance Summary Grid */}
      {balanceSummary && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs opacity-75 mb-1">Total Deposits</p>
            <p className="text-lg font-semibold">{formatCurrency(balanceSummary.totalDeposits || 0)}</p>
            <p className="text-xs opacity-75">{balanceSummary.depositsCount || 0} deposits</p>
          </div>

          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs opacity-75 mb-1">Total Payments</p>
            <p className="text-lg font-semibold">{formatCurrency(balanceSummary.totalPayments || 0)}</p>
            <p className="text-xs opacity-75">{balanceSummary.paymentsCount || 0} payments</p>
          </div>

          {balanceSummary.depositsThisPeriod !== undefined && (
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-75 mb-1">Deposits (30 days)</p>
              <p className="text-lg font-semibold">{formatCurrency(balanceSummary.depositsThisPeriod || 0)}</p>
            </div>
          )}

          {balanceSummary.paymentsThisPeriod !== undefined && (
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-75 mb-1">Payments (30 days)</p>
              <p className="text-lg font-semibold">{formatCurrency(balanceSummary.paymentsThisPeriod || 0)}</p>
            </div>
          )}

          {balanceSummary.pendingPaymentsCount > 0 && (
            <div className="col-span-2 bg-yellow-500/10 border border-yellow-300/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-75 mb-1">Pending Payments</p>
                  <p className="text-lg font-semibold">{balanceSummary.pendingPaymentsCount} payments pending</p>
                </div>
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account Status */}
      <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${accountData.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs opacity-75">
            {accountData.isActive ? 'Account Active' : 'Account Inactive'}
          </span>
        </div>
        {balanceSummary?.isBalanced !== undefined && (
          <span className="text-xs opacity-75">
            Balance: {balanceSummary.isBalanced ? '✓ Accurate' : '⚠️ Needs reconciliation'}
          </span>
        )}
      </div>

      {/* Adjust Balance Modal (admin only) */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
            <h3 className="text-base font-bold mb-1">Adjust Payroll Account Balance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Current balance: <span className="font-semibold">{formatCurrency(Number(accountData?.balance || 0))}</span>. This
              posts an audited correction entry — it does not overwrite history.
            </p>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correct Balance</label>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                value={adjustTarget}
                onChange={(e) => setAdjustTarget(e.target.value)}
                autoFocus
                className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (required)</label>
            <textarea
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              rows={3}
              placeholder="e.g. Reconciled against bank statement — balance was missing a deposit from before the backup restore."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 mb-4"
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
                className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
