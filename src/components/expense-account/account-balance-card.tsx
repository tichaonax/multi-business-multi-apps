'use client'

import { useState, useEffect } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'

interface AccountBalanceCardProps {
  accountData: any
  onRefresh?: () => void
  canViewExpenseReports?: boolean
}

export function AccountBalanceCard({ accountData, onRefresh, canViewExpenseReports = false }: AccountBalanceCardProps) {
  const customAlert = useAlert()
  const [balanceSummary, setBalanceSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (!accountData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">No account data available</p>
      </div>
    )
  }

  const balance = Number(accountData.balance || 0)
  const threshold = Number(accountData.lowBalanceThreshold || 500)
  const criticalThreshold = threshold * 0.5 // Critical is 50% of threshold

  const isCriticalBalance = balance < criticalThreshold
  const isLowBalance = balance < threshold && !isCriticalBalance
  const isNormalBalance = balance >= threshold

  // Determine card color based on balance status
  // For sibling accounts, use a different accent color (purple) when balance is normal.
  const cardGradient = isCriticalBalance
    ? 'from-red-500 to-red-600'
    : isLowBalance
    ? 'from-yellow-500 to-yellow-600'
    : accountData.isSibling
    ? 'from-purple-600 to-purple-700'
    : 'from-green-600 to-green-700'

  return (
    <div className={`bg-gradient-to-r ${cardGradient} rounded-lg shadow-lg p-4 text-white`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-medium opacity-90">{accountData.accountName || 'Expense Account'}</h2>
          <p className="text-xs opacity-75">{accountData.accountNumber}</p>
        </div>
        <button
          onClick={() => {
            fetchBalanceSummary()
            if (onRefresh) onRefresh()
          }}
          disabled={loading}
          className="p-2 hover:bg-white/20 dark:hover:bg-gray-800/20 rounded-lg transition-colors disabled:opacity-50"
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
      <div className="mb-2">
        <p className="text-xs font-medium opacity-90">Current Balance</p>
        <p className="text-2xl font-bold">{formatCurrency(balance)}</p>
      </div>

      {/* Balance Alert */}
      {isCriticalBalance && (
        <div className="bg-white/10 border border-white/30 rounded-md p-2 mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm">⚠️</span>
            <p className="text-xs opacity-90">
              <span className="font-semibold">Critical Balance Alert</span> — Below {formatCurrency(criticalThreshold)}. Please make a deposit soon.
            </p>
          </div>
        </div>
      )}

      {isLowBalance && (
        <div className="bg-white/10 border border-white/30 rounded-md p-2 mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm">⚡</span>
            <p className="text-xs opacity-90">
              <span className="font-semibold">Low Balance Warning</span> — Below {formatCurrency(threshold)}. Consider making a deposit.
            </p>
          </div>
        </div>
      )}

      {/* Balance Summary Grid */}
      {balanceSummary && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/10 rounded-md p-2">
            <p className="text-xs opacity-75">Total Deposits</p>
            <p className="text-sm font-semibold">
              {formatCurrency(balanceSummary.totalDeposits || 0)}
            </p>
            <p className="text-xs opacity-75">
              {canViewExpenseReports ? (
                <a
                  href={`/expense-accounts/${accountData.id}/deposits`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-xs text-green-800 dark:text-green-200 hover:underline"
                  aria-label={`Open deposits for ${accountData.accountName}`}
                >
                  <span className="font-semibold">{balanceSummary.depositCount || 0}</span>
                  <span className="opacity-75">deposits</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/10 text-xs text-gray-700 dark:text-gray-200">
                  <span className="font-semibold">{balanceSummary.depositCount || 0}</span>
                  <span className="opacity-75">deposits</span>
                </span>
              )}
            </p>
          </div>

          <div className="bg-white/10 rounded-md p-2">
            <p className="text-xs opacity-75">Total Payments</p>
            <p className="text-sm font-semibold">
              {formatCurrency(balanceSummary.totalPayments || 0)}
            </p>
            <p className="text-xs opacity-75">
              <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-xs text-orange-800 dark:text-orange-200">
                <span className="font-semibold">{balanceSummary.paymentCount || 0}</span>
                <span className="opacity-75">payments</span>
              </span>
            </p>
          </div>

          {balanceSummary.draftPaymentCount !== undefined &&
           balanceSummary.draftPaymentCount > 0 && (
            <div className="col-span-2 bg-white/10 border border-white/30 rounded-md p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-75">Draft Payments</p>
                  <p className="text-sm font-semibold">
                    {balanceSummary.draftPaymentCount} draft{balanceSummary.draftPaymentCount !== 1 ? 's' : ''} — {formatCurrency(balanceSummary.draftPaymentTotal || 0)} (not yet submitted)
                  </p>
                </div>
                <span className="text-sm">📝</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account Status */}
      <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${accountData.isActive ? 'bg-white' : 'bg-gray-400'}`}></div>
          <span className="text-xs opacity-75">
            {accountData.isActive ? 'Account Active' : 'Account Inactive'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs opacity-75">
            Threshold: {formatCurrency(threshold)}
          </span>
        </div>
      </div>
    </div>
  )
}
