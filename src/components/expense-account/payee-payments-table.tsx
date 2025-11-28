'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { formatCurrency } from '@/lib/format-currency'
import Link from 'next/link'

interface PayeePaymentsTableProps {
  payeeType: 'USER' | 'EMPLOYEE' | 'PERSON' | 'BUSINESS'
  payeeId: string
}

interface Payment {
  id: string
  amount: number
  paymentDate: string
  category: {
    id: string
    name: string
    emoji: string
  } | null
  receiptNumber: string | null
  receiptUrl: string | null
  notes: string | null
  status: string
  expenseAccount: {
    id: string
    accountName: string
    accountNumber: string
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

interface AccountGroup {
  accountId: string
  accountName: string
  accountNumber: string
  totalPaid: number
  paymentCount: number
  payments: Payment[]
}

export function PayeePaymentsTable({
  payeeType,
  payeeId,
}: PayeePaymentsTableProps) {
  const { data: session } = useSession()
  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [accountBreakdown, setAccountBreakdown] = useState<AccountGroup[]>([])
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [totalPaid, setTotalPaid] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // Filter states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (session?.user) {
      checkPermission()
    }
  }, [session])

  useEffect(() => {
    if (hasPermission && payeeId) {
      fetchPayments()
    }
  }, [hasPermission, payeeId, payeeType, startDate, endDate])

  const checkPermission = async () => {
    try {
      const permissions = await getEffectivePermissions(session?.user?.id || '')
      setHasPermission(permissions.canAccessExpenseAccount || false)
    } catch (error) {
      console.error('Error checking permissions:', error)
      setHasPermission(false)
    }
  }

  const fetchPayments = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      params.append('limit', '1000') // Get all payments

      const response = await fetch(
        `/api/expense-account/payees/${payeeType}/${payeeId}/payments?${params.toString()}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const result = await response.json()
        setPayments(result.data.payments)
        setTotalPaid(result.data.totalPaid)
        setTotalCount(result.data.paymentCount)

        // Group payments by account
        groupPaymentsByAccount(result.data.payments, result.data.accountBreakdown)
      }
    } catch (error) {
      console.error('Error fetching payee payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const groupPaymentsByAccount = (payments: Payment[], breakdown: any[]) => {
    // Create a map of accountId to payments
    const accountMap = new Map<string, Payment[]>()

    payments.forEach((payment) => {
      const accountId = payment.expenseAccount.id
      if (!accountMap.has(accountId)) {
        accountMap.set(accountId, [])
      }
      accountMap.get(accountId)!.push(payment)
    })

    // Build account groups
    const groups: AccountGroup[] = []
    breakdown.forEach((account) => {
      const accountPayments = accountMap.get(account.accountId) || []
      groups.push({
        accountId: account.accountId,
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        totalPaid: account.totalPaid,
        paymentCount: account.paymentCount,
        payments: accountPayments,
      })
    })

    setAccountBreakdown(groups)

    // Auto-expand first account
    if (groups.length > 0) {
      setExpandedAccounts(new Set([groups[0].accountId]))
    }
  }

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedAccounts(newExpanded)
  }

  const sortPayments = (payments: Payment[]) => {
    return [...payments].sort((a, b) => {
      const dateA = new Date(a.paymentDate).getTime()
      const dateB = new Date(b.paymentDate).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
  }

  // Don't render if no permission
  if (!hasPermission) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-gray-500 dark:text-gray-400">Loading payments...</div>
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          No expense account payments found
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header with Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Payment History
        </h3>

        <div className="flex flex-wrap gap-4">
          {/* Date Range Filter */}
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
              placeholder="End Date"
            />
          </div>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>

          {/* Clear Filters */}
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Payments by Account */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {accountBreakdown.map((account) => (
          <div key={account.accountId}>
            {/* Account Header */}
            <div
              className="p-4 bg-gray-50 dark:bg-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => toggleAccount(account.accountId)}
            >
              <div className="flex-1">
                <Link
                  href={`/expense-accounts/${account.accountId}`}
                  className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  {account.accountName}
                </Link>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {account.accountNumber} • {account.paymentCount} payment
                  {account.paymentCount !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(account.totalPaid)}
                  </div>
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {expandedAccounts.has(account.accountId) ? '▼' : '▶'}
                </div>
              </div>
            </div>

            {/* Payments Table */}
            {expandedAccounts.has(account.accountId) && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Receipt
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortPayments(account.payments).map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {payment.category ? (
                            <span className="text-gray-900 dark:text-gray-100">
                              {payment.category.emoji} {payment.category.name}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">
                              Uncategorized
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {payment.receiptNumber ? (
                            <span className="text-gray-900 dark:text-gray-100">
                              {payment.receiptNumber}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {payment.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total Footer */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: {totalCount} payment{totalCount !== 1 ? 's' : ''} across{' '}
            {accountBreakdown.length} account{accountBreakdown.length !== 1 ? 's' : ''}
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(totalPaid)}
          </div>
        </div>
      </div>
    </div>
  )
}
