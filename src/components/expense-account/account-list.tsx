'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreateAccountModal } from './create-account-modal'
import type { OnSuccessArg } from '@/types/ui'

interface ExpenseAccount {
  id: string
  accountNumber: string
  accountName: string
  description: string | null
  balance: number
  lowBalanceThreshold: number
  isActive: boolean
  createdAt: string
  creator?: {
    name: string
    email: string
  }
}

interface AccountListProps {
  onSelectAccount?: (account: ExpenseAccount) => void
  canCreateAccount?: boolean
}

export function AccountList({ onSelectAccount, canCreateAccount = false }: AccountListProps) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<ExpenseAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [showCreateModal, setShowCreateModal] = useState(false)

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
                className="card hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-primary">
                        {account.accountName}
                      </h3>
                      <span className="text-xs text-secondary px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                        {account.accountNumber}
                      </span>
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

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-secondary">Balance:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span>{balanceIndicator}</span>
                          <span className={`font-bold ${balanceColor}`}>
                            {formatCurrency(Number(account.balance))}
                          </span>
                        </div>
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
                  </div>

                  <div className="ml-4">
                    <svg
                      className="w-6 h-6 text-secondary"
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
    </div>
  )
}
