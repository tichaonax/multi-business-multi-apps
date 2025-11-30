'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { AccountBalanceCard } from '@/components/expense-account/account-balance-card'
import { DepositForm } from '@/components/expense-account/deposit-form'
import { PaymentForm } from '@/components/expense-account/payment-form'
import { TransactionHistory } from '@/components/expense-account/transaction-history'
import { getEffectivePermissions } from '@/lib/permission-utils'
import Link from 'next/link'

interface ExpenseAccount {
  id: string
  accountNumber: string
  accountName: string
  description: string | null
  balance: number
  lowBalanceThreshold: number
  isActive: boolean
  createdAt: string
  // Sibling account fields
  parentAccountId: string | null
  siblingNumber: number | null
  isSibling: boolean
  canMerge: boolean
}

export default function ExpenseAccountDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const accountId = params.accountId as string

  const [account, setAccount] = useState<ExpenseAccount | null>(null)
  const [depositsCount, setDepositsCount] = useState<number | null>(null)
  const [paymentsCount, setPaymentsCount] = useState<number | null>(null)
  const [countsError, setCountsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showDepositModal, setShowDepositModal] = useState(false)

  // Permissions
  const [canAccessExpenseAccount, setCanAccessExpenseAccount] = useState(false)
  const [canMakeExpenseDeposits, setCanMakeExpenseDeposits] = useState(false)
  const [canMakeExpensePayments, setCanMakeExpensePayments] = useState(false)
  const [canViewExpenseReports, setCanViewExpenseReports] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user && accountId) {
      checkPermissions()
      loadAccount()
      // Also fetch counts from the balance endpoint
      fetchCounts()
    }
  }, [session, accountId])

  const checkPermissions = async () => {
    try {
      const permissions = getEffectivePermissions(session?.user)

      setCanAccessExpenseAccount(permissions.canAccessExpenseAccount || false)
      setCanMakeExpenseDeposits(permissions.canMakeExpenseDeposits || false)
      setCanMakeExpensePayments(permissions.canMakeExpensePayments || false)
      setCanViewExpenseReports(permissions.canViewExpenseReports || false)

      if (!permissions.canAccessExpenseAccount) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error checking permissions:', error)
      router.push('/dashboard')
    }
  }

  const loadAccount = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/expense-account/${accountId}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setAccount(data.data.account)
      } else {
        router.push('/expense-accounts')
      }
    } catch (error) {
      console.error('Error loading account:', error)
      router.push('/expense-accounts')
    } finally {
      setLoading(false)
    }
  }

  const fetchCounts = async () => {
    try {
      const res = await fetch(`/api/expense-account/${accountId}/balance`, { credentials: 'include' })
      if (!res.ok) {
        // Set friendly error for UI and log status so it is obvious why counts are hidden
        if (res.status === 401 || res.status === 403) setCountsError('unauthorized')
        else setCountsError('unavailable')
        console.warn(`Failed to fetch balance counts: ${res.status}`)
        return
      }
      const data = await res.json()
      setDepositsCount(data?.data?.depositCount ?? 0)
      setPaymentsCount(data?.data?.paymentCount ?? 0)
      setCountsError(null)
    } catch (err) {
      console.error('Error fetching counts', err)
      setCountsError('error')
    }
  }

  const handleRefresh = () => {
    loadAccount()
  }

  const handleDepositSuccess = () => {
    loadAccount()
    setShowDepositModal(false)
  }

  const handlePaymentSuccess = () => {
    loadAccount()
  }

  if (status === 'loading' || loading) {
    return (
      <ContentLayout title="Expense Account">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (!account) {
    return (
      <ContentLayout title="Expense Account">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Account not found</div>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title={account.accountName}
      description={`Account #${account.accountNumber}`}
      headerActions={(
        <div className="flex items-center gap-6">
          <div className="text-sm text-secondary">Deposits</div>
          <div>
            {depositsCount !== null ? (
                  canMakeExpenseDeposits ? (
                    <a
                      href={`/expense-accounts/${accountId}/deposits`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-green-600 dark:text-green-400 font-semibold hover:underline"
                      aria-label={`Open deposits for ${account.accountName}`}
                    >
                      {depositsCount}
                    </a>
                  ) : (
                  <div className="text-green-600 font-semibold">{depositsCount}</div>
                )
              ) : (
                <div title={countsError ? `Counts not available (${countsError})` : 'Counts not loaded'} className="text-green-600 font-semibold">—</div>
              )}
          </div>
          <div className="text-sm text-secondary">Payments</div>
          <div title={countsError ? `Counts not available (${countsError})` : ''} className="text-orange-600 font-semibold">{paymentsCount ?? '—'}</div>
        </div>
      )}
    >
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/expense-accounts"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Expense Accounts
            </Link>
            {account.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{account.description}</p>
            )}
          </div>

          {canViewExpenseReports && (
            <Link
              href={`/expense-accounts/${accountId}/reports`}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
            >
              View Reports
            </Link>
          )}
        </div>

        {/* Balance Card */}
        <AccountBalanceCard
          accountData={account}
          onRefresh={handleRefresh}
          canViewExpenseReports={canViewExpenseReports}
        />

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Overview
              </button>

              {canMakeExpenseDeposits && (
                <button
                  onClick={() => setActiveTab('deposits')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'deposits'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Deposits
                </button>
              )}

              {canMakeExpensePayments && (
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'payments'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Payments
                </button>
              )}

              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Transaction History
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                      Account Information
                    </h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600 dark:text-gray-400">Account Number:</dt>
                        <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{account.accountNumber}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600 dark:text-gray-400">Status:</dt>
                        <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {account.isActive ? '✅ Active' : '❌ Inactive'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600 dark:text-gray-400">Created:</dt>
                        <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {new Date(account.createdAt).toLocaleDateString()}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                      Quick Actions
                    </h4>
                    <div className="space-y-2">
                      {canMakeExpenseDeposits && (
                        <button
                          onClick={() => setActiveTab('deposits')}
                          className="w-full px-4 py-2 text-left text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          💰 Make a Deposit
                        </button>
                      )}
                      {canMakeExpensePayments && (
                        <button
                          onClick={() => setActiveTab('payments')}
                          className="w-full px-4 py-2 text-left text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          💸 Make a Payment
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('transactions')}
                        className="w-full px-4 py-2 text-left text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        📜 View Transaction History
                      </button>
                      {canViewExpenseReports && (
                        <Link
                          href={`/expense-accounts/${accountId}/reports`}
                          className="block w-full px-4 py-2 text-left text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          📊 View Reports & Analytics
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Recent Transactions
                  </h4>
                  <TransactionHistory accountId={accountId} />
                </div>
              </div>
            )}

            {/* Deposits Tab */}
            {activeTab === 'deposits' && canMakeExpenseDeposits && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Add Deposit
                </h4>
                <DepositForm
                  accountId={accountId}
                  onSuccess={handleDepositSuccess}
                />
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && canMakeExpensePayments && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Create Payments
                </h4>
                <PaymentForm
                  accountId={accountId}
                  currentBalance={Number(account.balance)}
                  onSuccess={handlePaymentSuccess}
                  onAddFunds={() => setActiveTab('deposits')}
                  accountInfo={{
                    accountName: account.accountName,
                    isSibling: account.isSibling,
                    siblingNumber: account.siblingNumber,
                    parentAccountId: account.parentAccountId
                  }}
                />
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Transaction History
                </h4>
                <TransactionHistory accountId={accountId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </ContentLayout>
  )
}
