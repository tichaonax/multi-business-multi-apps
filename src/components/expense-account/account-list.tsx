'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreateAccountModal } from './create-account-modal'
import { CreateSiblingAccountModal } from './create-sibling-modal'
import { MergeAccountModal } from './merge-account-modal'
import type { OnSuccessArg } from '@/types/ui'

interface ExpenseAccount {
  id: string
  accountNumber: string
  accountName: string
  description: string | null
  balance: number
  lowBalanceThreshold: number
  depositsTotal?: number
  paymentsTotal?: number
  depositCount?: number
  paymentCount?: number
  largestPayment?: number
  largestPaymentPayee?: string | null
  isActive: boolean
  createdAt: string
  parentAccountId?: string | null
  siblingNumber?: number | null
  isSibling: boolean
  canMerge: boolean
  creator?: {
    name: string
    email: string
  }
}

interface AccountListProps {
  onSelectAccount?: (account: ExpenseAccount) => void
  canCreateAccount?: boolean
  canCreateSiblingAccounts?: boolean
  canMergeSiblingAccounts?: boolean
  canViewExpenseReports?: boolean
}

export function AccountList({ 
  onSelectAccount, 
  canCreateAccount = false,
  canCreateSiblingAccounts = false,
  canMergeSiblingAccounts = false
  , canViewExpenseReports = false
}: AccountListProps) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<ExpenseAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateSiblingModal, setShowCreateSiblingModal] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ExpenseAccount | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/expense-account', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.data.accounts || [])
      }
    } catch (error) {
      console.error('Failed to load expense accounts:', error)
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
    if (balance < threshold) return 'low'
    return 'normal'
  }

  const getBalanceColor = (status: string) => {
    const colors: Record<string, string> = {
      critical: 'text-red-600 dark:text-red-400',
      low: 'text-yellow-600 dark:text-yellow-400',
      normal: 'text-green-600 dark:text-green-400',
    }
    return colors[status] || 'text-gray-600'
  }

  const getBalanceIndicator = (status: string) => {
    const indicators: Record<string, string> = {
      critical: '🔴',
      low: '🟡',
      normal: '🟢',
    }
    return indicators[status] || '⚪'
  }

  const handleAccountClick = (account: ExpenseAccount) => {
    if (onSelectAccount) {
      onSelectAccount(account)
    } else {
      router.push(`/expense-accounts/${account.id}`)
    }
  }

  const handleCreateSuccess = (payload: OnSuccessArg) => {
    loadAccounts()
    if (payload.id) {
      router.push(`/expense-accounts/${payload.id}`)
    }
  }

  const handleCreateError = (error: string) => {
    console.error('Account creation error:', error)
  }

  const handleSiblingCreate = (account: ExpenseAccount) => {
    setSelectedAccount(account)
    setShowCreateSiblingModal(true)
  }

  const handleMergeAccount = (account: ExpenseAccount) => {
    setSelectedAccount(account)
    setShowMergeModal(true)
  }

  const handleSiblingSuccess = (payload: OnSuccessArg) => {
    if (payload.refresh) {
      loadAccounts()
    }
  }

  const handleMergeSuccess = (payload: OnSuccessArg) => {
    if (payload.refresh) {
      loadAccounts()
    }
  }

  const handleSiblingCreateSuccess = (payload: OnSuccessArg) => {
    loadAccounts()
    if (payload.id) {
      router.push(`/expense-accounts/${payload.id}`)
    }
  }

  const handleSiblingCreateError = (error: string) => {
    console.error('Sibling account creation error:', error)
  }

  const handleMergeError = (error: string) => {
    console.error('Account merge error:', error)
  }

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    // Status filter
    if (filterStatus === 'active' && !account.isActive) return false
    if (filterStatus === 'inactive' && account.isActive) return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        account.accountName.toLowerCase().includes(query) ||
        account.accountNumber.toLowerCase().includes(query) ||
        account.description?.toLowerCase().includes(query)
      )
    }

    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-secondary">Loading expense accounts...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Expense Accounts</h2>
        {canCreateAccount && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            + Create New Account
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, account number, or description..."
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Accounts List */}
      {filteredAccounts.length === 0 ? (
        <div className="text-center py-12 card">
          <p className="text-secondary mb-4">
            {searchQuery
              ? 'No accounts found matching your search'
              : 'No expense accounts found'}
          </p>
          {canCreateAccount && !searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Your First Account
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAccounts.map((account) => {
            const balanceStatus = getBalanceStatus(
              Number(account.balance),
              Number(account.lowBalanceThreshold)
            )
            const balanceColor = getBalanceColor(balanceStatus)
            const balanceIndicator = getBalanceIndicator(balanceStatus)

            return (
              <div
                    key={account.id}
                    onClick={() => handleAccountClick(account)}
                    className={`card px-6 hover:shadow-md transition-shadow cursor-pointer ${account.isSibling ? 'bg-gradient-to-r from-purple-50/50 dark:from-purple-900/10 border-l-4 border-purple-300 dark:border-purple-700' : ''}`}
                  >
                <div className="flex items-center justify-between">
                  <div className="flex-1 pl-6">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-primary">
                        {account.accountName}
                      </h3>
                      <span className="text-xs text-secondary px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                        {account.accountNumber}
                      </span>
                      {account.isSibling && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          SIBLING
                        </span>
                      )}
                      {!account.isActive && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                          INACTIVE
                        </span>
                      )}
                    </div>

                    {account.description && (
                      <p className="text-sm text-secondary mb-2">
                        {account.description}
                      </p>
                    )}

                    {account.isSibling && account.parentAccountId && (
                      <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          <strong>Sibling Account #{account.siblingNumber}</strong> of parent account
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-secondary">Balance:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span>{balanceIndicator}</span>
                          <span className={`font-bold ${balanceColor}`}>
                            {formatCurrency(Number(account.balance))}
                          </span>
                        </div>
                        {/* removed duplicate deposits/payments display here - now shown in the right badge */}
                      </div>
                      <div>
                        <span className="text-secondary">Threshold:</span>
                        <span className="ml-2 font-medium text-primary">
                          {formatCurrency(Number(account.lowBalanceThreshold))}
                        </span>
                      </div>
                      <div>
                        <span className="text-secondary">Status:</span>
                        <span className="ml-2 font-medium text-primary">
                          {balanceStatus === 'critical'
                            ? 'Critical'
                            : balanceStatus === 'low'
                            ? 'Low Balance'
                            : 'Healthy'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-secondary">
                      Created by {account.creator?.name || 'Unknown'} on{' '}
                      {new Date(account.createdAt).toLocaleDateString()}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 flex gap-2">
                      {canCreateSiblingAccounts && !account.isSibling && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSiblingCreate(account)
                          }}
                          className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800 rounded transition-colors"
                          title="Create a sibling account for historical data entry"
                        >
                          Create Sibling
                        </button>
                      )}
                      {canMergeSiblingAccounts && account.isSibling && account.canMerge && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMergeAccount(account)
                          }}
                          className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:hover:bg-orange-800 rounded transition-colors"
                          title="Merge this sibling account back into its parent"
                        >
                          Merge
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col items-end gap-2 min-w-[200px] pl-6 pr-5 py-3 rounded-md bg-white/5 dark:bg-gray-900/30 border border-gray-200/5">
                    <div className="text-right text-xs text-secondary">Deposits</div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(Number(account.depositsTotal ?? 0))}</div>
                      <div className="text-right text-xs text-secondary">
                        {/* deposit count chip */}
                        {canViewExpenseReports ? (
                          <a
                            href={`/expense-accounts/${account.id}/deposits`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-xs text-green-800 dark:text-green-200 hover:underline"
                            aria-label={`Open deposit report for ${account.accountName}`}
                            title={`Open deposit report for ${account.accountName}`}
                          >
                            <span className="font-semibold">{account.depositCount ?? 0}</span>
                            <span className="opacity-75">deposits</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/10 text-xs text-gray-700 dark:text-gray-200">
                            <span className="font-semibold">{account.depositCount ?? 0}</span>
                            <span className="opacity-75">deposits</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-secondary">Payments</div>
                    <div className="text-right">
                      <div className="font-semibold text-orange-600 dark:text-orange-300">{formatCurrency(Number(account.paymentsTotal ?? 0))}</div>
                      <div className="text-right text-xs text-secondary">
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-xs text-orange-800 dark:text-orange-200">
                          <span className="font-semibold">{account.paymentCount ?? 0}</span>
                          <span className="opacity-75">payments</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-secondary mt-1">Largest Payment</div>
                      <div className="text-right">
                        {account.largestPaymentId ? (
                          <a
                            href={`/expense-accounts/${account.id}/payments/${account.largestPaymentId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                            aria-label={`Open largest payment ${formatCurrency(Number(account.largestPayment ?? 0))}`}
                          >
                            {formatCurrency(Number(account.largestPayment ?? 0))}
                          </a>
                        ) : (
                          <div className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(Number(account.largestPayment ?? 0))}</div>
                        )}
                      {account.largestPaymentPayee && (
                        <div className="text-xs text-secondary">to {account.largestPaymentPayee}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Account Modal */}
      <CreateAccountModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        onError={handleCreateError}
      />

      {/* Create Sibling Account Modal */}
      <CreateSiblingAccountModal
        isOpen={showCreateSiblingModal}
        onClose={() => setShowCreateSiblingModal(false)}
        parentAccount={selectedAccount}
        onSuccess={handleSiblingCreateSuccess}
        onError={handleSiblingCreateError}
      />

      {/* Merge Account Modal */}
      <MergeAccountModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        siblingAccount={selectedAccount}
        onSuccess={handleMergeSuccess}
        onError={handleMergeError}
      />
    </div>
  )
}
