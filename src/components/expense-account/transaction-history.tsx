'use client'

import { useState, useEffect } from 'react'
import { DateInput } from '@/components/ui/date-input'

interface Transaction {
  id: string
  type: 'DEPOSIT' | 'PAYMENT'
  amount: number
  date: string
  description: string
  balanceAfter: number
  // Deposit-specific
  sourceType?: string
  sourceBusiness?: { id: string; name: string; type: string }
  transactionType?: string
  // Payment-specific
  payeeType?: string
  payeeUser?: { id: string; name: string }
  payeeEmployee?: { id: string; fullName: string }
  payeePerson?: { id: string; fullName: string }
  payeeBusiness?: { id: string; name: string }
  category?: { id: string; name: string; emoji: string }
  receiptNumber?: string
  status?: string
  createdBy?: { id: string; name: string }
  createdAt: string
}

interface TransactionHistoryProps {
  accountId: string
  defaultType?: 'DEPOSIT' | 'PAYMENT'
  defaultSortOrder?: 'asc' | 'desc'
  pageLimit?: number
}

export function TransactionHistory({ accountId, defaultType = '', defaultSortOrder = 'desc', pageLimit = 50 }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>(defaultType)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = pageLimit

  useEffect(() => {
    loadTransactions()
  }, [accountId, startDate, endDate, typeFilter, page])
  // also refetch when sortOrder changes
  useEffect(() => {
    setPage(0)
    loadTransactions()
  }, [sortOrder])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (typeFilter) params.append('transactionType', typeFilter)
      params.append('limit', limit.toString())
      params.append('offset', (page * limit).toString())
      params.append('sortOrder', sortOrder)

      const response = await fetch(
        `/api/expense-account/${accountId}/transactions?${params.toString()}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        setTransactions(data.data.transactions || [])
        setHasMore(data.data.pagination?.hasMore || false)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setTypeFilter(defaultType)
    setPage(0)
  }

  if (loading && page === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-secondary">Loading transaction history...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <DateInput
              value={startDate}
              onChange={setStartDate}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <DateInput
              value={endDate}
              onChange={setEndDate}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Transactions</option>
              <option value="DEPOSIT">Deposits Only</option>
              <option value="PAYMENT">Payments Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((transaction) => {
                  const isDeposit = transaction.type === 'DEPOSIT'

                  return (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => {
                        const detailPath = isDeposit
                          ? `/expense-accounts/${accountId}/deposits/${transaction.id}`
                          : `/expense-accounts/${accountId}/payments/${transaction.id}`
                        window.location.href = detailPath
                      }}
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(transaction.date)}
                      </td>

                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${
                            isDeposit
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {isDeposit ? '📥' : '📤'}<span className="hidden sm:inline"> {isDeposit ? 'Deposit' : 'Payment'}</span>
                        </span>
                      </td>

                      <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-sm text-gray-900 dark:text-gray-100">
                        <div>
                          {transaction.description}
                        </div>
                        {transaction.receiptNumber && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Receipt: {transaction.receiptNumber}
                          </div>
                        )}
                      </td>

                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {transaction.category ? (
                          <span>
                            {transaction.category.emoji} {transaction.category.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {transaction.sourceBusiness ? (
                          <span className="font-medium">{transaction.sourceBusiness.name}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>

                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-right">
                        <span
                          className={`text-xs sm:text-sm font-semibold ${
                            isDeposit
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {isDeposit ? '+' : '-'}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </td>

                      <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(transaction.balanceAfter)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {(page > 0 || hasMore) && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page + 1}
            </span>

            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
