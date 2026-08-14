import React, { useState } from 'react'
import { useBusinessBalance } from '@/hooks/useBusinessBalance'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface BusinessBalanceDisplayProps {
  businessId: string | null
  businessName?: string
  showRefreshButton?: boolean
  className?: string
  variant?: 'full' | 'compact' | 'inline'
  isAdmin?: boolean
}

export function BusinessBalanceDisplay({
  businessId,
  businessName = 'Business',
  showRefreshButton = false,
  className = '',
  variant = 'full',
  isAdmin = false
}: BusinessBalanceDisplayProps) {
  const { balanceInfo, loading, error, refreshBalance } = useBusinessBalance(businessId)
  const customAlert = useAlert()
  const confirm = useConfirm()
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const openAdjustModal = () => {
    setAdjustTarget(String(balanceInfo?.balance ?? 0))
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
      customAlert({ title: 'Reason required', description: 'Explain why this balance is being corrected (e.g. reconciled against the bank statement).' })
      return
    }
    const current = balanceInfo?.balance ?? 0
    const confirmed = await confirm({
      title: 'Adjust Business Balance?',
      description: `This changes the balance from $${formatCurrency(current)} to $${formatCurrency(target)} by posting an audited correction entry. This cannot be undone automatically — only with another correction.`,
      confirmText: 'Adjust Balance',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    setAdjusting(true)
    try {
      const res = await fetch(`/api/business/balance/${businessId}/adjust-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetBalance: target, reason: adjustReason.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setShowAdjustModal(false)
        refreshBalance()
      } else {
        customAlert({ title: 'Error', description: data.error || 'Failed to adjust balance.' })
      }
    } catch {
      customAlert({ title: 'Error', description: 'Network error. Please try again.' })
    } finally {
      setAdjusting(false)
    }
  }

  if (!businessId) {
    return null
  }

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-secondary">Loading balance...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        <span>Error loading balance</span>
        {showRefreshButton && (
          <button
            onClick={refreshBalance}
            className="ml-2 text-blue-600 hover:text-blue-800 underline"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (!balanceInfo) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        Balance information unavailable
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <span className={`text-sm ${className}`}>
        {balanceInfo.hasAccount ? (
          <span className="font-medium text-green-600">
            ${balanceInfo.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ) : (
          <span className="text-orange-600">Not initialized</span>
        )}
      </span>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <span className="text-sm font-medium text-secondary">
          {businessName} Sales Balance:
        </span>
        <div className="flex items-center space-x-2">
          {balanceInfo.hasAccount ? (
            <span className="text-sm font-bold text-green-600">
              ${balanceInfo.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          ) : (
            <span className="text-sm text-orange-600">Not initialized</span>
          )}
          {showRefreshButton && (
            <button
              onClick={refreshBalance}
              className="text-blue-600 hover:text-blue-800 text-xs"
              title="Refresh balance"
            >
              🔄
            </button>
          )}
        </div>
      </div>
    )
  }

  // Full variant
  return (
    <div className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
          💰 {businessName} Sales Balance
        </h4>
        {showRefreshButton && (
          <button
            onClick={refreshBalance}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            title="Refresh balance"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-700 dark:text-blue-300">Sales Balance:</span>
          {balanceInfo.hasAccount ? (
            <span className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                ${formatCurrency(balanceInfo.balance)}
              </span>
              {isAdmin && (
                <button
                  onClick={openAdjustModal}
                  className="opacity-50 hover:opacity-100 transition-opacity leading-none text-sm"
                  title="Manually correct this balance (admin only)"
                >✏️</button>
              )}
            </span>
          ) : (
            <span className="text-sm text-orange-600 dark:text-orange-400">
              Account not initialized
            </span>
          )}
        </div>
        <p className="text-[11px] text-blue-600/80 dark:text-blue-400/70 -mt-1">
          Revenue retained across all payment methods (cash, card, EcoCash) — not physical cash.
          See Cash Box for cash on hand.
        </p>

        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-700 dark:text-blue-300">Status:</span>
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            balanceInfo.hasAccount
              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
          }`}>
            {balanceInfo.hasAccount ? 'Active' : 'Needs Setup'}
          </span>
        </div>
      </div>

      {!balanceInfo.hasAccount && (
        <div className="mt-3 text-xs text-orange-700 dark:text-orange-300">
          ⚠️ This business needs balance initialization before loans can be processed.
        </div>
      )}

      {/* Adjust Balance Modal (admin only) */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Adjust Business Balance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Current balance: <span className="font-semibold">${formatCurrency(balanceInfo.balance)}</span>. This posts an
              audited correction entry — it does not overwrite history.
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
                className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary"
              />
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (required)</label>
            <textarea
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              rows={3}
              placeholder="e.g. Reconciled against bank statement — a deposit from before the backup restore was missing."
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