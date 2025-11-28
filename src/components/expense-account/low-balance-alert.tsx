'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface LowBalanceAccount {
  id: string
  accountNumber: string
  accountName: string
  balance: number
  lowBalanceThreshold: number
}

export function LowBalanceAlert() {
  const router = useRouter()
  const [lowBalanceAccounts, setLowBalanceAccounts] = useState<LowBalanceAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLowBalanceAccounts()
  }, [])

  const loadLowBalanceAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/expense-account', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const accounts = data.data.accounts || []

        // Filter for low balance accounts (active accounts below threshold)
        const lowBalance = accounts.filter((account: any) => {
          const balance = Number(account.balance)
          const threshold = Number(account.lowBalanceThreshold)
          return account.isActive && balance < threshold
        })

        setLowBalanceAccounts(lowBalance)
      }
    } catch (error) {
      console.error('Failed to load low balance accounts:', error)
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

  const getBalanceStatus = (balance: number, threshold: number) => {
    const criticalThreshold = threshold * 0.5
    if (balance < criticalThreshold) return 'critical'
    return 'low'
  }

  const handleAccountClick = (accountId: string) => {
    router.push(`/expense-accounts/${accountId}`)
  }

  // Don't show anything if loading or no low balance accounts
  if (loading || lowBalanceAccounts.length === 0) {
    return null
  }

  const criticalAccounts = lowBalanceAccounts.filter(
    (account) => getBalanceStatus(account.balance, account.lowBalanceThreshold) === 'critical'
  )
  const warningAccounts = lowBalanceAccounts.filter(
    (account) => getBalanceStatus(account.balance, account.lowBalanceThreshold) === 'low'
  )

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 shadow-md">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            Low Balance Alert
          </h3>

          <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
            {lowBalanceAccounts.length === 1
              ? '1 expense account needs attention'
              : `${lowBalanceAccounts.length} expense accounts need attention`}
          </p>

          <div className="space-y-2">
            {/* Critical Accounts */}
            {criticalAccounts.map((account) => (
              <div
                key={account.id}
                onClick={() => handleAccountClick(account.id)}
                className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md cursor-pointer hover:shadow-sm transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-600 dark:text-red-400 font-semibold">⚠️</span>
                    <span className="font-semibold text-red-900 dark:text-red-200">
                      {account.accountName}
                    </span>
                    <span className="text-xs text-red-700 dark:text-red-400 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded">
                      {account.accountNumber}
                    </span>
                  </div>
                  <div className="text-sm text-red-800 dark:text-red-300">
                    Balance: <span className="font-bold">{formatCurrency(account.balance)}</span>
                    <span className="mx-2">•</span>
                    Threshold: {formatCurrency(account.lowBalanceThreshold)}
                  </div>
                  <div className="text-xs text-red-700 dark:text-red-400 mt-1">
                    Critical: Balance is below 50% of threshold
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            ))}

            {/* Warning Accounts */}
            {warningAccounts.map((account) => (
              <div
                key={account.id}
                onClick={() => handleAccountClick(account.id)}
                className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md cursor-pointer hover:shadow-sm transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-600 dark:text-yellow-400 font-semibold">⚡</span>
                    <span className="font-semibold text-yellow-900 dark:text-yellow-200">
                      {account.accountName}
                    </span>
                    <span className="text-xs text-yellow-700 dark:text-yellow-400 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                      {account.accountNumber}
                    </span>
                  </div>
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    Balance: <span className="font-bold">{formatCurrency(account.balance)}</span>
                    <span className="mx-2">•</span>
                    Threshold: {formatCurrency(account.lowBalanceThreshold)}
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    Low: Balance is below threshold
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
            <button
              onClick={() => router.push('/expense-accounts')}
              className="text-sm font-medium text-yellow-800 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-200 flex items-center gap-1"
            >
              View All Expense Accounts
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
