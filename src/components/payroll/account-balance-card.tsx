'use client'

import { useState, useEffect } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'

interface AccountBalanceCardProps {
  accountData: any
  onRefresh?: () => void
}

export function AccountBalanceCard({ accountData, onRefresh }: AccountBalanceCardProps) {
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
      const response = await fetch('/api/payroll/account/balance', {
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
  const isLowBalance = balance < 1000
  const isCriticalBalance = balance < 500

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
          className="p-2 hover:bg-white dark:bg-gray-800/20 rounded-lg transition-colors disabled:opacity-50"
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
        <p className="text-4xl font-bold">{formatCurrency(balance)}</p>
      </div>

      {/* Balance Alert */}
      {isCriticalBalance && (
        <div className="bg-red-500/10 border border-red-300/50 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">Critical Balance Alert</p>
              <p className="text-xs opacity-90">
                Balance is below $500. Please make a deposit soon to avoid payment delays.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLowBalance && !isCriticalBalance && (
        <div className="bg-yellow-500/10 border border-yellow-300/50 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <span className="text-xl">⚡</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">Low Balance Warning</p>
              <p className="text-xs opacity-90">
                Balance is below $1,000. Consider making a deposit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Balance Summary Grid */}
      {balanceSummary && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800/10 rounded-lg p-3">
            <p className="text-xs opacity-75 mb-1">Total Deposits</p>
            <p className="text-lg font-semibold">
              {formatCurrency(balanceSummary.totalDeposits || 0)}
            </p>
            <p className="text-xs opacity-75">
              {balanceSummary.depositsCount || 0} deposits
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800/10 rounded-lg p-3">
            <p className="text-xs opacity-75 mb-1">Total Payments</p>
            <p className="text-lg font-semibold">
              {formatCurrency(balanceSummary.totalPayments || 0)}
            </p>
            <p className="text-xs opacity-75">
              {balanceSummary.paymentsCount || 0} payments
            </p>
          </div>

          {balanceSummary.depositsThisPeriod !== undefined && (
            <div className="bg-white dark:bg-gray-800/10 rounded-lg p-3">
              <p className="text-xs opacity-75 mb-1">Deposits (30 days)</p>
              <p className="text-lg font-semibold">
                {formatCurrency(balanceSummary.depositsThisPeriod || 0)}
              </p>
            </div>
          )}

          {balanceSummary.paymentsThisPeriod !== undefined && (
            <div className="bg-white dark:bg-gray-800/10 rounded-lg p-3">
              <p className="text-xs opacity-75 mb-1">Payments (30 days)</p>
              <p className="text-lg font-semibold">
                {formatCurrency(balanceSummary.paymentsThisPeriod || 0)}
              </p>
            </div>
          )}

          {balanceSummary.pendingPaymentsCount !== undefined &&
           balanceSummary.pendingPaymentsCount > 0 && (
            <div className="col-span-2 bg-yellow-500/10 border border-yellow-300/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-75 mb-1">Pending Payments</p>
                  <p className="text-lg font-semibold">
                    {balanceSummary.pendingPaymentsCount} payments pending
                  </p>
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
          <div className="flex items-center space-x-2">
            <span className="text-xs opacity-75">
              Balance: {balanceSummary.isBalanced ? '✓ Accurate' : '⚠️ Needs reconciliation'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
