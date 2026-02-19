'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { AccountBalanceCard } from '@/components/expense-account/account-balance-card'
import { DepositForm } from '@/components/expense-account/deposit-form'
import { PaymentForm } from '@/components/expense-account/payment-form'
import { TransactionHistory } from '@/components/expense-account/transaction-history'
import { QuickPaymentModal } from '@/components/expense-account/quick-payment-modal'
import { QuickDepositModal } from '@/components/expense-account/quick-deposit-modal'
import { AccountPermissionsTab } from '@/components/expense-account/account-permissions-tab'
import { LoansTab } from '@/components/expense-account/loans-tab'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
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
  businessId: string | null
  accountType: string
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
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false)

  // Permissions from business context (properly fetched from API)
  const { hasPermission, loading: permissionsLoading, isSystemAdmin, isBusinessOwner, currentBusiness } = useBusinessPermissionsContext()
  const canAccessExpenseAccount = hasPermission('canAccessExpenseAccount')
  const canMakeExpenseDeposits = hasPermission('canMakeExpenseDeposits')
  const canMakeExpensePayments = hasPermission('canMakeExpensePayments')
  const canViewExpenseReports = hasPermission('canViewExpenseReports')
  const canChangeCategory = isSystemAdmin || isBusinessOwner || currentBusiness?.role === 'business-manager'
  const canCreatePayees = canChangeCategory // Only owners, managers, and admins can create payees

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (!permissionsLoading && !canAccessExpenseAccount) {
      router.push('/dashboard')
    }
  }, [permissionsLoading, canAccessExpenseAccount, router])

  useEffect(() => {
    if (session?.user && accountId) {
      loadAccount()
      fetchCounts()
    }
  }, [session, accountId])

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

  if (status === 'loading' || loading || permissionsLoading) {
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
        <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-secondary">Deposits</span>
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
                  <span className="text-green-600 font-semibold">{depositsCount}</span>
                )
              ) : (
                <span title={countsError ? `Counts not available (${countsError})` : 'Counts not loaded'} className="text-green-600 font-semibold">—</span>
              )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-secondary">Payments</span>
            <span title={countsError ? `Counts not available (${countsError})` : ''} className="text-orange-600 font-semibold">{paymentsCount ?? '—'}</span>
          </div>
        </div>
      )}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Link
              href="/expense-accounts"
              className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Expense Accounts
            </Link>
            <div className="flex items-center gap-2 mt-1">
              {account.accountType === 'PERSONAL' ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  PERSONAL ACCOUNT
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  GENERAL ACCOUNT
                </span>
              )}
            </div>
            {account.description && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{account.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {canMakeExpenseDeposits && (
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs sm:text-sm font-medium"
              >
                Quick Deposit
              </button>
            )}
            {canMakeExpensePayments && (
              <button
                onClick={() => setShowQuickPaymentModal(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-xs sm:text-sm font-medium"
              >
                Quick Payment
              </button>
            )}
            {canViewExpenseReports && (
              <Link
                href={`/expense-accounts/${accountId}/reports`}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-xs sm:text-sm font-medium"
              >
                View Reports
              </Link>
            )}
          </div>
        </div>

        {/* Balance Card */}
        <AccountBalanceCard
          accountData={account}
          onRefresh={handleRefresh}
          canViewExpenseReports={canViewExpenseReports}
        />

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <nav className="flex -mb-px min-w-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
                className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Transactions
              </button>

              <button
                onClick={() => setActiveTab('loans')}
                className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'loans'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Loans
              </button>

              {isSystemAdmin && (
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'permissions'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Permissions
                </button>
              )}
            </nav>
          </div>

          <div className="p-3 sm:p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                      Account Information
                    </h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Account Number:</dt>
                        <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">{account.accountNumber}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Status:</dt>
                        <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                          {account.isActive ? '✅ Active' : '❌ Inactive'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Created:</dt>
                        <dd className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                          {new Date(account.createdAt).toLocaleDateString()}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                      Quick Actions
                    </h4>
                    <div className="space-y-2">
                      {canMakeExpenseDeposits && (
                        <button
                          onClick={() => setActiveTab('deposits')}
                          className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          💰 Make a Deposit
                        </button>
                      )}
                      {canMakeExpensePayments && (
                        <button
                          onClick={() => setActiveTab('payments')}
                          className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          💸 Make a Payment
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('transactions')}
                        className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        📜 View Transactions
                      </button>
                      {canViewExpenseReports && (
                        <Link
                          href={`/expense-accounts/${accountId}/reports`}
                          className="block w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          📊 View Reports
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                    Recent Transactions
                  </h4>
                  <TransactionHistory accountId={accountId} />
                </div>
              </div>
            )}

            {/* Deposits Tab */}
            {activeTab === 'deposits' && canMakeExpenseDeposits && (
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                  Add Deposit
                </h4>
                <DepositForm
                  accountId={accountId}
                  accountType={account.accountType}
                  onSuccess={handleDepositSuccess}
                />
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && canMakeExpensePayments && (
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                  Create Payments
                </h4>
                <PaymentForm
                  accountId={accountId}
                  businessId={account.businessId || currentBusiness?.id}
                  currentBalance={Number(account.balance)}
                  onSuccess={handlePaymentSuccess}
                  onAddFunds={() => setActiveTab('deposits')}
                  canCreatePayees={canCreatePayees}
                  accountType={account.accountType}
                  defaultCategoryBusinessType={currentBusiness?.businessType}
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
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                  Transaction History
                </h4>
                <TransactionHistory accountId={accountId} />
              </div>
            )}

            {/* Loans Tab */}
            {activeTab === 'loans' && (
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                  Loans
                </h4>
                <LoansTab accountId={accountId} />
              </div>
            )}

            {/* Permissions Tab (admin only) */}
            {activeTab === 'permissions' && isSystemAdmin && (
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                  Account Access
                </h4>
                <AccountPermissionsTab accountId={accountId} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Deposit Modal */}
      {account && (
        <QuickDepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          accountId={accountId}
          accountName={account.accountName}
          onSuccess={() => {
            loadAccount()
            setShowDepositModal(false)
          }}
          onError={(error) => console.error('Quick deposit error:', error)}
        />
      )}

      {/* Quick Payment Modal */}
      {account && (
        <QuickPaymentModal
          isOpen={showQuickPaymentModal}
          onClose={() => setShowQuickPaymentModal(false)}
          accountId={accountId}
          accountName={account.accountName}
          currentBalance={Number(account.balance)}
          onSuccess={() => {
            loadAccount()
            setShowQuickPaymentModal(false)
          }}
          onError={(error) => console.error('Quick payment error:', error)}
          canCreatePayees={canCreatePayees}
          canChangeCategory={canChangeCategory}
          accountType={account.accountType}
          defaultCategoryBusinessType={currentBusiness?.businessType}
        />
      )}
    </ContentLayout>
  )
}
