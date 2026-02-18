'use client'

import { useState, useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatCurrency } from '@/lib/format-currency'

interface PayeeExpenseSummaryProps {
  payeeType: 'USER' | 'EMPLOYEE' | 'PERSON' | 'BUSINESS'
  payeeId: string
  onViewDetails?: () => void
}

interface SummaryData {
  totalPaid: number
  paymentCount: number
  accountsCount: number
  accountBreakdown: Array<{
    accountId: string
    accountName: string
    accountNumber: string
    totalPaid: number
    paymentCount: number
  }>
}

export function PayeeExpenseSummary({
  payeeType,
  payeeId,
  onViewDetails,
}: PayeeExpenseSummaryProps) {
  const { hasPermission } = useBusinessPermissionsContext()
  const canAccessExpenseAccount = hasPermission('canAccessExpenseAccount')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SummaryData | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (canAccessExpenseAccount && payeeId) {
      fetchSummaryData()
    }
  }, [canAccessExpenseAccount, payeeId, payeeType])

  const fetchSummaryData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/expense-account/payees/${payeeType}/${payeeId}/payments`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const result = await response.json()
        setData({
          totalPaid: result.data.totalPaid,
          paymentCount: result.data.paymentCount,
          accountsCount: result.data.accountsCount,
          accountBreakdown: result.data.accountBreakdown,
        })
      }
    } catch (error) {
      console.error('Error fetching payee expense summary:', error)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if no permission
  if (!canAccessExpenseAccount) {
    return null
  }

  // Don't render if loading and no data yet
  if (loading && !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Expense Account Payments
        </h3>
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  // Don't render if no payments
  if (!data || data.paymentCount === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Expense Account Payments
          </h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {expanded ? 'Hide Details' : 'View Details'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Paid */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Paid
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(data.totalPaid)}
            </div>
          </div>

          {/* Payment Count */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Payments
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.paymentCount}
            </div>
          </div>

          {/* Accounts Count */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Accounts
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {data.accountsCount}
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && data.accountBreakdown.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Breakdown by Account
            </h4>
            <div className="space-y-2">
              {data.accountBreakdown.map((account) => (
                <div
                  key={account.accountId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-1">
                    <a
                      href={`/expense-accounts/${account.accountId}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      {account.accountName}
                    </a>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {account.accountNumber} • {account.paymentCount} payment
                      {account.paymentCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(account.totalPaid)}
                  </div>
                </div>
              ))}
            </div>

            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                View Full Payment History
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
