'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { AccountBalanceCard } from '@/components/expense-account/account-balance-card'
import { DepositForm } from '@/components/expense-account/deposit-form'
import { PaymentForm } from '@/components/expense-account/payment-form'
import { TransactionHistory } from '@/components/expense-account/transaction-history'
import { QuickPaymentModal } from '@/components/expense-account/quick-payment-modal'
import { QuickDepositModal } from '@/components/expense-account/quick-deposit-modal'
import { AccountPermissionsTab } from '@/components/expense-account/account-permissions-tab'
import { LoansTab } from '@/components/expense-account/loans-tab'
import { ReturnTransferModal } from '@/components/expense-account/return-transfer-modal'
import { LendMoneyModal } from '@/components/expense-account/lend-money-modal'
import { FundPayrollModal } from '@/components/expense-account/fund-payroll-modal'
import { OutgoingLoansPanel } from '@/components/expense-account/outgoing-loans-panel'
import SmartQuickPaymentModal from '@/components/expense-account/smart-quick-payment-modal'
import VehicleExpenseModal from '@/components/expense-account/vehicle-expense-modal'
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
  // Landlord info for RENT accounts
  landlordSupplierId?: string | null
  landlordSupplierName?: string | null
}

// ─── Recent Deposits Panel ──────────────────────────────────────────────────
interface RecentDeposit {
  id: string
  amount: number
  date: string
  description: string
  sourceType: string
  sourceBusiness?: { name: string } | null
}

function RecentDepositsPanel({ accountId, refreshKey }: { accountId: string; refreshKey: number }) {
  const [deposits, setDeposits] = useState<RecentDeposit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/expense-account/${accountId}/transactions?transactionType=DEPOSIT&limit=5&sortOrder=desc`)
      .then(r => r.json())
      .then(data => {
        if (data?.data?.transactions) setDeposits(data.data.transactions)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId, refreshKey])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const sourceLabel = (d: RecentDeposit) => {
    if (d.sourceType === 'BUSINESS') return d.sourceBusiness?.name ?? 'Business'
    if (d.sourceType === 'MANUAL') return 'Manual'
    if (d.sourceType === 'LOAN') return 'Loan'
    if (d.sourceType === 'WIFI_TOKEN_SALE') return 'WiFi Sale'
    return d.sourceType.charAt(0) + d.sourceType.slice(1).toLowerCase()
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-border">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Recent Deposits</span>
        {loading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
      </div>
      {!loading && deposits.length === 0 ? (
        <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">No deposits yet</p>
      ) : (
        <div className="divide-y divide-border">
          {deposits.map(d => (
            <div key={d.id} className="flex items-center gap-2 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary truncate">{sourceLabel(d)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{d.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400">+{fmt(d.amount)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(d.date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
// ────────────────────────────────────────────────────────────────────────────

// ─── Recent Payments Panel ──────────────────────────────────────────────────
interface RecentPayment {
  id: string
  amount: number
  paymentDate: string
  createdAt: string
  payeeType: string
  payeeUser?: { name: string } | null
  payeeEmployee?: { fullName: string } | null
  payeePerson?: { fullName: string } | null
  payeeBusiness?: { name: string } | null
  payeeSupplier?: { name: string } | null
  category?: { name: string; emoji: string } | null
  receiptNumber?: string | null
  status: string
}

function RecentPaymentsPanel({ accountId, refreshKey }: { accountId: string; refreshKey: number }) {
  const [payments, setPayments] = useState<RecentPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/expense-account/${accountId}/payments?sortBy=createdAt&limit=5`)
      .then(r => r.json())
      .then(data => {
        if (data?.data?.payments) setPayments(data.data.payments)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId, refreshKey])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const payeeName = (p: RecentPayment): string => {
    if (p.payeeType === 'NONE') return 'General'
    if (p.payeeUser) return p.payeeUser.name
    if (p.payeeEmployee) return p.payeeEmployee.fullName
    if (p.payeePerson) return p.payeePerson.fullName
    if (p.payeeBusiness) return p.payeeBusiness.name
    if (p.payeeSupplier) return p.payeeSupplier.name
    return 'Unknown'
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-border">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Recently Entered</span>
        {loading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
      </div>
      {!loading && payments.length === 0 ? (
        <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">No payments yet</p>
      ) : (
        <div className="divide-y divide-border">
          {payments.map(p => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {p.category?.emoji && <span className="text-xs shrink-0">{p.category.emoji}</span>}
                  <p className="text-xs font-medium text-primary truncate">{payeeName(p)}</p>
                  {p.status === 'DRAFT' && (
                    <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">DRAFT</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {p.category?.name ?? 'No category'}
                  {p.receiptNumber ? ` · #${p.receiptNumber}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">−{fmt(p.amount)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500" title={`Payment date: ${fmtDate(p.paymentDate)}`}>
                  entered {fmtDate(p.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
// ────────────────────────────────────────────────────────────────────────────

export default function ExpenseAccountDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const accountId = params.accountId as string
  const searchParams = useSearchParams()
  const urlTab       = searchParams.get('tab')       ?? ''
  const urlStartDate = searchParams.get('startDate') ?? ''
  const urlEndDate   = searchParams.get('endDate')   ?? ''
  const urlType      = searchParams.get('type')      ?? ''  // 'PAYMENT' | 'DEPOSIT' | ''

  const [account, setAccount] = useState<ExpenseAccount | null>(null)
  const [depositsCount, setDepositsCount] = useState<number | null>(null)
  const [paymentsCount, setPaymentsCount] = useState<number | null>(null)
  const [countsError, setCountsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(urlTab || 'overview')
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false)
  const [showReturnTransferModal, setShowReturnTransferModal] = useState(false)
  const [showLendMoneyModal, setShowLendMoneyModal] = useState(false)
  const [showFundPayrollModal, setShowFundPayrollModal] = useState(false)
  const [showSmartQuickPayModal, setShowSmartQuickPayModal] = useState(false)
  const [showVehicleExpenseModal, setShowVehicleExpenseModal] = useState(false)
  const [loansRefreshKey, setLoansRefreshKey] = useState(0)
  const [batchRefreshKey, setBatchRefreshKey] = useState(0)
  const [depositRefreshKey, setDepositRefreshKey] = useState(0)
  const [paymentRefreshKey, setPaymentRefreshKey] = useState(0)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  // Permissions from business context (properly fetched from API)
  const { hasPermission, loading: permissionsLoading, isSystemAdmin, isBusinessOwner, currentBusiness, businesses } = useBusinessPermissionsContext()
  const canAccessExpenseAccount = hasPermission('canAccessExpenseAccount')
  const canMakeExpenseDeposits = hasPermission('canMakeExpenseDeposits')
  const canMakeExpensePayments = hasPermission('canMakeExpensePayments')
  const canViewExpenseReports = hasPermission('canViewExpenseReports')
  const canManageLending = isSystemAdmin || hasPermission('canManageLending')
  const canChangeCategory = isSystemAdmin || isBusinessOwner || currentBusiness?.role === 'business-manager'
  const canViewSupplierPaymentQueue = hasPermission('canViewSupplierPaymentQueue')
  const canCreatePayees = canChangeCategory // Only owners, managers, and admins can create payees
  const canEditPayments = canChangeCategory // Same set of roles can edit payments

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

  // Fetch pending supplier payment requests for this account's business
  useEffect(() => {
    if (!account?.businessId || !canViewSupplierPaymentQueue) return
    fetch(`/api/supplier-payments/requests?businessId=${account.businessId}&status=PENDING&limit=1`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setPendingRequestsCount(data?.pagination?.total ?? 0) })
      .catch(() => {})
  }, [account?.businessId, canViewSupplierPaymentQueue])

  const handleRefresh = () => {
    loadAccount()
  }

  const handleDepositSuccess = () => {
    loadAccount()
    setShowDepositModal(false)
    setDepositRefreshKey(k => k + 1)
  }

  const handlePaymentSuccess = () => {
    loadAccount()
    setPaymentRefreshKey(k => k + 1)
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
      <div className="space-y-2">
        {/* Compact header: back link · badge · description · actions */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Back link */}
          <Link
            href="/expense-accounts"
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-0.5 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Accounts
          </Link>

          <span className="text-gray-300 dark:text-gray-600 text-xs">/</span>

          {/* Account type badge */}
          {account.accountType === 'PERSONAL' ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 shrink-0">
              PERSONAL
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
              GENERAL
            </span>
          )}

          {/* Description (if any) */}
          {account.description && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{account.description}</span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons — compact */}
          {/* RENT accounts only show Deposit, Payment and Reports — Daily/Vehicle are not applicable */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {canMakeExpenseDeposits && (
              <button
                onClick={() => setShowDepositModal(true)}
                className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
              >
                + Deposit
              </button>
            )}
            {canMakeExpensePayments && (
              <button
                onClick={() => setShowQuickPaymentModal(true)}
                className="px-2.5 py-1 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700"
              >
                + Payment
              </button>
            )}
            {canMakeExpensePayments && account.accountType !== 'RENT' && (
              <button
                onClick={() => setShowSmartQuickPayModal(true)}
                className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
              >
                ⚡ Daily
              </button>
            )}
            {canMakeExpensePayments && account.accountType !== 'RENT' && (
              <button
                onClick={() => setShowVehicleExpenseModal(true)}
                className="px-2.5 py-1 bg-slate-600 text-white rounded text-xs font-medium hover:bg-slate-700"
              >
                🚗 Vehicle
              </button>
            )}
            {canViewExpenseReports && (
              <Link
                href={`/expense-accounts/${accountId}/reports`}
                className="px-2.5 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700"
              >
                Reports
              </Link>
            )}
          </div>
        </div>

        {/* Balance Card */}
        <AccountBalanceCard
          accountData={account}
          onRefresh={handleRefresh}
          canViewExpenseReports={canViewExpenseReports}
          canEditThreshold={canChangeCategory}
        />

        {/* Pending supplier payment requests notice */}
        {canViewSupplierPaymentQueue && pendingRequestsCount > 0 && (
          <Link
            href={`/supplier-payments?businessId=${account.businessId}`}
            className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <span className="text-lg">📋</span>
            <span className="flex-1 font-medium text-amber-800 dark:text-amber-200">
              {pendingRequestsCount} pending supplier payment {pendingRequestsCount === 1 ? 'request' : 'requests'} awaiting approval
            </span>
            <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold shrink-0">Review →</span>
          </Link>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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

              {canManageLending && (
                <button
                  onClick={() => setActiveTab('lent-out')}
                  className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'lent-out'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Lent Out
                </button>
              )}

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

          <div className="p-2 sm:p-3">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-3">
                {/* Compact info bar + quick actions on one row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {/* Account info chips */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    <span className="opacity-60">#</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{account.accountNumber}</span>
                  </div>
                  <div className="text-xs shrink-0">
                    {account.isActive
                      ? <span className="text-green-600 dark:text-green-400">✅ Active</span>
                      : <span className="text-red-500">❌ Inactive</span>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    <span className="opacity-60">Since</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(account.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex-1 hidden sm:block" />

                  {/* Quick action buttons inline */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {canMakeExpenseDeposits && (
                      <button
                        onClick={() => setActiveTab('deposits')}
                        className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-400 dark:hover:border-green-700 transition-colors"
                      >
                        💰 Deposit
                      </button>
                    )}
                    {canMakeExpensePayments && (
                      <button
                        onClick={() => setActiveTab('payments')}
                        className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-400 dark:hover:border-orange-700 transition-colors"
                      >
                        💸 Payment
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-700 transition-colors"
                    >
                      📜 Transactions
                    </button>
                    {canViewExpenseReports && (
                      <Link
                        href={`/expense-accounts/${accountId}/reports`}
                        className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-400 dark:hover:border-purple-700 transition-colors"
                      >
                        📊 Reports
                      </Link>
                    )}
                    {(isSystemAdmin || canViewExpenseReports) && account?.businessId && (() => {
                      const bType = businesses?.find(b => b.businessId === account.businessId)?.businessType ?? currentBusiness?.businessType ?? 'restaurant'
                      return (
                        <Link
                          href={`/${bType}/reports/financial-insights`}
                          className="px-4 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                          title="Analyse profit margins, cost trends and opportunities"
                        >
                          📈 Financial Insights
                        </Link>
                      )
                    })()}
                  </div>
                </div>

                <TransactionHistory accountId={accountId} canEditPayments={canEditPayments} isAdmin={isSystemAdmin} />
              </div>
            )}

            {/* Deposits Tab */}
            {activeTab === 'deposits' && canMakeExpenseDeposits && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-start">
                {/* Deposit Form */}
                <div className="lg:col-span-3">
                  <DepositForm
                    accountId={accountId}
                    accountType={account.accountType}
                    onSuccess={handleDepositSuccess}
                  />
                </div>
                {/* Last 5 Deposits Panel */}
                <div className="lg:col-span-2">
                  <RecentDepositsPanel accountId={accountId} refreshKey={depositRefreshKey} />
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && canMakeExpensePayments && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-start">
                {/* Left: Payment Form */}
                <div className="lg:col-span-3">
                  <PaymentForm
                    accountId={accountId}
                    businessId={account.businessId || currentBusiness?.id}
                    currentBalance={Number(account.balance)}
                    onSuccess={handlePaymentSuccess}
                    onAddFunds={() => setActiveTab('deposits')}
                    canCreatePayees={canCreatePayees}
                    accountType={account.accountType}
                    defaultCategoryBusinessType={currentBusiness?.businessType}
                    batchRefreshKey={batchRefreshKey}
                    accountInfo={{
                      accountName: account.accountName,
                      isSibling: account.isSibling,
                      siblingNumber: account.siblingNumber,
                      parentAccountId: account.parentAccountId
                    }}
                  />
                </div>
                {/* Right: action buttons + recent panel */}
                <div className="lg:col-span-2 flex flex-col gap-2">
                  <div className="flex items-center justify-end gap-2">
                    {canMakeExpensePayments && (
                      <button
                        onClick={() => setShowFundPayrollModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                      >
                        💵 Fund Payroll
                      </button>
                    )}
                    <button
                      onClick={() => setShowReturnTransferModal(true)}
                      disabled={account.balance <= 0}
                      title={account.balance <= 0 ? 'Insufficient balance to return transfer' : undefined}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-purple-50 dark:disabled:hover:bg-purple-900/20"
                    >
                      🔄 Return Transfer
                    </button>
                  </div>
                  <RecentPaymentsPanel accountId={accountId} refreshKey={paymentRefreshKey} />
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                <TransactionHistory
                  accountId={accountId}
                  canEditPayments={canEditPayments}
                  isAdmin={isSystemAdmin}
                  initialStartDate={urlStartDate || undefined}
                  initialEndDate={urlEndDate || undefined}
                  defaultType={(urlType === 'PAYMENT' || urlType === 'DEPOSIT') ? urlType : ''}
                />
              </div>
            )}

            {/* Loans Tab */}
            {activeTab === 'loans' && (
              <div>
                <LoansTab accountId={accountId} />
              </div>
            )}

            {/* Lent Out Tab */}
            {activeTab === 'lent-out' && canManageLending && (
              <div>
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setShowLendMoneyModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    🤝 Lend Money
                  </button>
                </div>
                <OutgoingLoansPanel
                  accountId={accountId}
                  canManage={canManageLending}
                  refreshKey={loansRefreshKey}
                  onRepaymentSuccess={loadAccount}
                />
              </div>
            )}

            {/* Permissions Tab (admin only) */}
            {activeTab === 'permissions' && isSystemAdmin && (
              <div>
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
          businessId={account.businessId || currentBusiness?.id}
          presetPayee={
            account.accountType === 'RENT' && account.landlordSupplierId && account.landlordSupplierName
              ? { type: 'SUPPLIER', id: account.landlordSupplierId, name: account.landlordSupplierName }
              : null
          }
        />
      )}

      {/* Return Transfer Modal */}
      {showReturnTransferModal && account && (
        <ReturnTransferModal
          accountId={accountId}
          currentBalance={Number(account.balance)}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowReturnTransferModal(false)}
        />
      )}

      {/* Lend Money Modal */}
      {showLendMoneyModal && account && (
        <LendMoneyModal
          accountId={accountId}
          accountName={account.accountName}
          accountBalance={Number(account.balance)}
          currentBusinessId={account.businessId}
          onSuccess={() => {
            loadAccount()
            setLoansRefreshKey(k => k + 1)
          }}
          onClose={() => setShowLendMoneyModal(false)}
        />
      )}

      {/* Fund Payroll Modal */}
      {showFundPayrollModal && account && (
        <FundPayrollModal
          accountId={accountId}
          accountName={account.accountName}
          accountBalance={Number(account.balance)}
          onSuccess={() => {
            loadAccount()
            setShowFundPayrollModal(false)
          }}
          onClose={() => setShowFundPayrollModal(false)}
        />
      )}

      {/* Smart Daily Expenses Modal — adds to queue, switches to Payments tab */}
      {account && (
        <SmartQuickPaymentModal
          isOpen={showSmartQuickPayModal}
          onClose={() => setShowSmartQuickPayModal(false)}
          accountId={accountId}
          accountBalance={Number(account.balance)}
          defaultCategoryBusinessType={currentBusiness?.businessType}
          businessId={account.businessId || currentBusiness?.id}
          onSuccess={() => {
            setShowSmartQuickPayModal(false)
            setActiveTab('payments')
          }}
        />
      )}

      {/* Vehicle Expenses Modal — adds to queue, switches to Payments tab */}
      {account && (
        <VehicleExpenseModal
          isOpen={showVehicleExpenseModal}
          onClose={() => setShowVehicleExpenseModal(false)}
          accountId={accountId}
          accountBalance={Number(account.balance)}
          canManageVehicles={isSystemAdmin || isBusinessOwner || hasPermission('canManageVehicles')}
          onSuccess={() => {
            setShowVehicleExpenseModal(false)
            setBatchRefreshKey(k => k + 1)
            setActiveTab('payments')
          }}
        />
      )}
    </ContentLayout>
  )
}
