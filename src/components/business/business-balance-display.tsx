import React from 'react'
import { useBusinessBalance } from '@/hooks/useBusinessBalance'

interface BusinessBalanceDisplayProps {
  businessId: string | null
  businessName?: string
  showRefreshButton?: boolean
  className?: string
  variant?: 'full' | 'compact' | 'inline'
}

export function BusinessBalanceDisplay({
  businessId,
  businessName = 'Business',
  showRefreshButton = false,
  className = '',
  variant = 'full'
}: BusinessBalanceDisplayProps) {
  const { balanceInfo, loading, error, refreshBalance } = useBusinessBalance(businessId)

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
            ${balanceInfo.balance.toFixed(2)}
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
          {businessName} Balance:
        </span>
        <div className="flex items-center space-x-2">
          {balanceInfo.hasAccount ? (
            <span className="text-sm font-bold text-green-600">
              ${balanceInfo.balance.toFixed(2)}
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
          💰 {businessName} Balance
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
          <span className="text-sm text-blue-700 dark:text-blue-300">Available Balance:</span>
          {balanceInfo.hasAccount ? (
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              ${balanceInfo.balance.toFixed(2)}
            </span>
          ) : (
            <span className="text-sm text-orange-600 dark:text-orange-400">
              Account not initialized
            </span>
          )}
        </div>

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
    </div>
  )
}