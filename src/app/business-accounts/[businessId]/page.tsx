'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

// ── Types ────────────────────────────────────────────────────────────────────

interface AccountData {
  id: string
  businessId: string
  balance: number
  totalCredits: number
  totalDebits: number
  createdAt: string
  updatedAt: string
  lastTransactionAt: string | null
}

interface BusinessData {
  id: string
  name: string
  type: string
}

interface BizTransaction {
  id: string
  businessId: string
  amount: number
  type: string
  description: string
  referenceId: string | null
  referenceType: string | null
  balanceAfter: number
  createdAt: string
  createdBy: string
  notes: string | null
  isCredit: boolean
  destination: string | null  // resolved name of expense/payroll account for debits
}

interface ChartDay {
  date: string
  credits: number
  debits: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

const fmtShort = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

const CREDIT_TYPES = ['deposit', 'transfer', 'loan_received', 'CREDIT']
const TYPE_ICONS: Record<string, string> = {
  deposit: '⬆️',
  CREDIT: '⬆️',
  transfer: '↔️',
  loan_received: '🤝',
  withdrawal: '⬇️',
  DEBIT: '⬇️',
  loan_disbursement: '💸',
  loan_payment: '💳',
}
const TYPE_LABELS: Record<string, string> = {
  deposit: 'Sale Revenue',
  CREDIT: 'Credit',
  transfer: 'Transfer In',
  loan_received: 'Loan In',
  withdrawal: 'Withdrawal',
  DEBIT: 'Debit Out',
  loan_disbursement: 'Loan Out',
  loan_payment: 'Loan Payment',
}
const REF_LABELS: Record<string, string> = {
  order: 'Sale',
  PAYROLL_DEPOSIT: 'Payroll Transfer',
  PAYROLL_EXPENSE: 'Payroll Transfer',
  EXPENSE_DEPOSIT: 'Expense Transfer',
  EXPENSE_TRANSFER: 'Expense Transfer',
  EXPENSE_TRANSFER_RETURN: 'Return',
  DEBIT: 'Debit Out',
}

// Descriptions that are misleading when viewed from the source business
const MISLEADING_DESC_PREFIXES = [
  'Manual transfer from ',
  'Deposit from ',
  'Transfer from ',
]
function isDescriptionMisleading(desc: string | null) {
  if (!desc) return true
  return MISLEADING_DESC_PREFIXES.some((p) => desc.startsWith(p))
}

// ── Transaction row ──────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: BizTransaction }) {
  const isCredit = CREDIT_TYPES.includes(tx.type)

  // Primary label: for debits always show where money went
  let primaryLabel: string
  if (!isCredit) {
    if (tx.destination) {
      primaryLabel = `→ ${tx.destination}`
    } else if (tx.referenceType === 'PAYROLL_DEPOSIT' || tx.referenceType === 'PAYROLL_EXPENSE') {
      primaryLabel = '→ Payroll Account'
    } else if (tx.referenceType === 'EXPENSE_DEPOSIT' || tx.referenceType === 'EXPENSE_TRANSFER') {
      primaryLabel = '→ Expense Account'
    } else {
      primaryLabel = tx.description || (TYPE_LABELS[tx.type] ?? tx.type)
    }
  } else {
    primaryLabel = tx.description
  }

  // Sub-text: only show if useful (not a misleading "from" phrase)
  const showSubDesc = isCredit
    ? false  // credits show description as primary already
    : tx.notes
      ? false  // notes shown separately
      : !isDescriptionMisleading(tx.description) && tx.description !== primaryLabel

  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <span className="text-base shrink-0 w-6 text-center">{TYPE_ICONS[tx.type] ?? '•'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-xs font-medium text-primary truncate">{primaryLabel}</p>
          {tx.referenceType && REF_LABELS[tx.referenceType] && (
            <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
              {REF_LABELS[tx.referenceType]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {TYPE_LABELS[tx.type] ?? tx.type} · {fmtDate(tx.createdAt)}
          </p>
          {showSubDesc && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[180px]">
              · {tx.description}
            </p>
          )}
          {tx.notes && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
              · {tx.notes}
            </p>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p
          className={`text-xs font-semibold ${
            isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {isCredit ? '+' : '−'}{fmt(Math.abs(tx.amount))}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          bal {fmt(tx.balanceAfter)}
        </p>
      </div>
    </div>
  )
}

// ── Transactions Tab ─────────────────────────────────────────────────────────

function TransactionsTab({ businessId }: { businessId: string }) {
  const [transactions, setTransactions] = useState<BizTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'credits' | 'debits'>('debits')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(0)
  const limit = 20

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(page * limit),
      type: typeFilter,
      sortOrder: 'desc',
    })
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    fetch(`/api/business/${businessId}/account/transactions?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setTransactions(res.data.transactions)
          setTotal(res.data.total)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [businessId, typeFilter, startDate, endDate, page])

  useEffect(() => {
    setPage(0)
  }, [typeFilter, startDate, endDate])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-2">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(['all', 'credits', 'debits'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                typeFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 rounded border border-border bg-white dark:bg-gray-800 text-primary text-xs"
            placeholder="From"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 rounded border border-border bg-white dark:bg-gray-800 text-primary text-xs"
            placeholder="To"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate('') }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕ Clear
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {loading ? 'Loading…' : `${total} transaction${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* List */}
      <div className="border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Loading transactions…</div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">No transactions found</div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs px-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2.5 py-1 rounded border border-border disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-2.5 py-1 rounded border border-border disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab({ businessId }: { businessId: string }) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [chartData, setChartData] = useState<ChartDay[]>([])
  const [summary, setSummary] = useState({ totalCredits: 0, totalDebits: 0, net: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/business/${businessId}/account/stats?period=${period}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setChartData(res.data.chartData)
          setSummary(res.data.summary)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [businessId, period])

  const periodLabels = { '7d': '7 days', '30d': '30 days', '90d': '90 days', '1y': '1 year' }

  return (
    <div className="space-y-3">
      {/* Period selector + summary */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(['7d', '30d', '90d', '1y'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
        {!loading && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-green-600 dark:text-green-400 font-medium">
              ↑ {fmt(summary.totalCredits)}
            </span>
            <span className="text-red-600 dark:text-red-400 font-medium">
              ↓ {fmt(summary.totalDebits)}
            </span>
            <span className={`font-semibold ${summary.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Net {fmt(summary.net)}
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="border border-border rounded-lg p-3">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-xs text-gray-400 animate-pulse">
            Loading chart…
          </div>
        ) : chartData.every((d) => d.credits === 0 && d.debits === 0) ? (
          <div className="h-48 flex items-center justify-center text-xs text-gray-400">
            No activity in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="creditsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="debitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis
                dataKey="date"
                tickFormatter={fmtShort}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                tick={{ fontSize: 10 }}
                width={42}
              />
              <Tooltip
                formatter={(value: number, name: string) => [fmt(value), name === 'credits' ? 'Credits' : 'Debits']}
                labelFormatter={(label) => fmtDate(label)}
                contentStyle={{ fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area
                type="monotone"
                dataKey="credits"
                name="Credits"
                stroke="#16a34a"
                strokeWidth={2}
                fill="url(#creditsGrad)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="debits"
                name="Debits"
                stroke="#dc2626"
                strokeWidth={2}
                fill="url(#debitsGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BusinessAccountDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const businessId = params.businessId as string

  const { loading: permissionsLoading, isSystemAdmin, hasPermission } = useBusinessPermissionsContext()
  const canAccessFinancialData = isSystemAdmin || hasPermission('canAccessFinancialData')

  const [account, setAccount] = useState<AccountData | null>(null)
  const [business, setBusiness] = useState<BusinessData | null>(null)
  const [hasAccount, setHasAccount] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'reports'>('overview')

  // Recent transactions for overview
  const [recentTxs, setRecentTxs] = useState<BizTransaction[]>([])
  const [recentLoading, setRecentLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (!permissionsLoading && !canAccessFinancialData) router.push('/dashboard')
  }, [permissionsLoading, canAccessFinancialData, router])

  const loadAccount = useCallback(async () => {
    if (!session?.user || !businessId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/business/${businessId}/account`)
      if (!res.ok) {
        router.push('/business-accounts')
        return
      }
      const data = await res.json()
      if (!data.success) {
        router.push('/business-accounts')
        return
      }
      setBusiness(data.data.business)
      setHasAccount(data.data.hasAccount)
      if (data.data.account) setAccount(data.data.account)
    } catch {
      router.push('/business-accounts')
    } finally {
      setLoading(false)
    }
  }, [session, businessId, router])

  const loadRecentTxs = useCallback(async () => {
    if (!businessId) return
    setRecentLoading(true)
    try {
      const res = await fetch(`/api/business/${businessId}/account/transactions?limit=10&sortOrder=desc`)
      const data = await res.json()
      if (data.success) setRecentTxs(data.data.transactions)
    } catch {
      // ignore
    } finally {
      setRecentLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadAccount()
  }, [loadAccount])

  useEffect(() => {
    if (!loading && hasAccount) loadRecentTxs()
  }, [loading, hasAccount, loadRecentTxs])

  if (status === 'loading' || loading || permissionsLoading) {
    return (
      <ContentLayout title="Business Account">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading…</div>
        </div>
      </ContentLayout>
    )
  }

  if (!business) return null

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      retail: 'Retail', restaurant: 'Restaurant', clothing: 'Clothing',
      construction: 'Construction', salon: 'Salon', grocery: 'Grocery',
    }
    return map[t] ?? t.charAt(0).toUpperCase() + t.slice(1)
  }

  return (
    <ContentLayout
      title={business.name}
      description="Business Account"
    >
      <div className="space-y-2">
        {/* Breadcrumb + badges + refresh */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Link
            href="/business-accounts"
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-0.5 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Accounts
          </Link>
          <span className="text-gray-300 dark:text-gray-600 text-xs">/</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
            {typeLabel(business.type)}
          </span>
          <div className="flex-1" />
          <button
            onClick={loadAccount}
            className="px-2.5 py-1 text-xs border border-border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Balance card */}
        {account ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Balance</p>
                <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {fmt(account.balance)}
                </p>
              </div>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
              <div>
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total In</p>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">{fmt(account.totalCredits)}</p>
              </div>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
              <div>
                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Out</p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">{fmt(account.totalDebits)}</p>
              </div>
              {account.lastTransactionAt && (
                <>
                  <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Last Activity</p>
                    <p className="text-sm font-medium text-primary">{fmtDate(account.lastTransactionAt)}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border px-4 py-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No account initialized for this business.</p>
          </div>
        )}

        {/* Tabs */}
        {hasAccount && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <nav className="flex -mb-px min-w-0">
                {(['overview', 'transactions', 'reports'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap capitalize ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    {tab === 'overview' ? '📊 Overview' : tab === 'transactions' ? '📜 Transactions' : '📈 Reports'}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-2 sm:p-3">
              {/* ── Overview ── */}
              {activeTab === 'overview' && (
                <div className="space-y-3">
                  {/* Quick-nav buttons */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="opacity-60">Business</span>
                      <span className="font-medium text-primary">{business.name}</span>
                    </div>
                    <div className="flex-1 hidden sm:block" />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveTab('transactions')}
                        className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-colors"
                      >
                        📜 Transactions
                      </button>
                      <button
                        onClick={() => setActiveTab('reports')}
                        className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-400 transition-colors"
                      >
                        📈 Reports
                      </button>
                    </div>
                  </div>

                  {/* Recent transactions */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-border">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Recent Transactions</span>
                      {recentLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
                      {!recentLoading && (
                        <button
                          onClick={() => setActiveTab('transactions')}
                          className="text-[10px] text-blue-500 hover:text-blue-600"
                        >
                          View all →
                        </button>
                      )}
                    </div>
                    {!recentLoading && recentTxs.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-gray-400 text-center">No transactions yet</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {recentTxs.map((tx) => (
                          <TxRow key={tx.id} tx={tx} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Transactions ── */}
              {activeTab === 'transactions' && (
                <TransactionsTab businessId={businessId} />
              )}

              {/* ── Reports ── */}
              {activeTab === 'reports' && (
                <ReportsTab businessId={businessId} />
              )}
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
