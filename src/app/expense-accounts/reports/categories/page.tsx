'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import Link from 'next/link'

function toISODate(d: Date) {
  return d.toISOString().split('T')[0]
}

function defaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { start, end }
}

const CHART_COLORS = [
  '#87B5A5', '#E8D5C4', '#C9A5B8', '#A8C5D6',
  '#8B7B8B', '#F4C9A0', '#FFD3A0', '#B5D5A5',
]

interface CategoryRow {
  categoryId: string
  categoryName: string
  emoji: string
  color: string
  totalAmount: number
  paymentCount: number
  percentage: number
}

interface SystemTotals {
  totalSpent: number
  totalPayments: number
  topCategory: string | null
}

interface AccountOption {
  id: string
  accountName: string
  accountNumber: string
}

export default function CategoryAnalysisReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [byCategory, setByCategory] = useState<CategoryRow[]>([])
  const [totals, setTotals] = useState<SystemTotals | null>(null)
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange())
  const [allTime, setAllTime] = useState(true)
  const [accountId, setAccountId] = useState('')
  const [nameSearch, setNameSearch] = useState('')

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const permissions = getEffectivePermissions(session?.user)
    if (!permissions.canViewExpenseReports) { router.push('/expense-accounts'); return }
    loadAccounts()
    loadReport()
  }, [status, session])

  useEffect(() => {
    if (status !== 'authenticated') return
    loadReport()
  }, [dateRange, allTime, accountId])

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/expense-account?limit=100', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAccounts((data.data || []).map((a: any) => ({
          id: a.id,
          accountName: a.accountName,
          accountNumber: a.accountNumber,
        })))
      }
    } catch (e) {
      console.error('Error loading accounts:', e)
    }
  }

  const loadReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (!allTime) {
        params.append('startDate', toISODate(dateRange.start))
        params.append('endDate', toISODate(dateRange.end))
      }
      if (accountId) params.append('accountId', accountId)
      const res = await fetch(`/api/expense-account/reports/categories?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setByCategory(data.data?.byCategory || [])
        setTotals(data.data?.systemTotals || null)
      }
    } catch (e) {
      console.error('Error loading report:', e)
    } finally {
      setLoading(false)
    }
  }

  const chartData = byCategory.slice(0, 8).map((c) => ({
    name: `${c.emoji || ''} ${c.categoryName}`.trim(),
    value: c.totalAmount,
  }))

  // Search is applied client-side against the already loaded rows.
  const visibleCategories = useMemo(() => {
    if (!nameSearch.trim()) return byCategory
    const q = nameSearch.trim().toLowerCase()
    return byCategory.filter(c => c.categoryName.toLowerCase().includes(q))
  }, [byCategory, nameSearch])

  return (
    <ContentLayout title="Category Analysis" subtitle="Spending breakdown by category across all expense accounts">
      <div className="space-y-6">
        <Link href="/expense-accounts/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reports Hub
        </Link>

        {/* Always-visible search — not tucked inside the collapsed filters,
            since it's the control people reach for most on this report. */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            placeholder="Search by category…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          showAllTime
          allTime={allTime}
          onAllTimeChange={setAllTime}
        />

        {/* Filters */}
        <CollapsibleSection
          title="Filters"
          icon="🔎"
          badge={accountId ? (
            <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">Active</span>
          ) : undefined}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
              >
                <option value="">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.accountName} ({a.accountNumber})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setAccountId(''); setAllTime(true); setDateRange(defaultDateRange()) }}
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Reset
              </button>
            </div>
          </div>
        </CollapsibleSection>

        {/* Summary cards */}
        {totals && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totals.totalSpent)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Top Category</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 truncate">{totals.topCategory || '—'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Payments</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totals.totalPayments}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : byCategory.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No categorized payments found</div>
        ) : visibleCategories.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No categories match "{nameSearch}"</div>
        ) : (
          <>
            {/* Pie chart */}
            {chartData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-4">Top Categories (by spend)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Category Breakdown</h3>
              </div>
              {/* Mobile card list (MBM-299 responsive-reports template — see
                  src/app/inventory/reports/pricing-exceptions/page.tsx) */}
              <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {visibleCategories.map((cat) => (
                  <div key={cat.categoryId} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
                        {cat.categoryName}
                      </span>
                      <span className="font-medium text-red-600 dark:text-red-400 shrink-0">{formatCurrency(cat.totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{cat.paymentCount} payment{cat.paymentCount === 1 ? '' : 's'}</span>
                      <div className="flex items-center gap-2 flex-1 max-w-[60%]">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                          <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(cat.percentage, 100)}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right shrink-0">{cat.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Spent</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"># Payments</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {visibleCategories.map((cat) => (
                      <tr key={cat.categoryId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
                            {cat.categoryName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(cat.totalAmount)}</td>
                        <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{cat.paymentCount}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                              <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(cat.percentage, 100)}%` }}></div>
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">{cat.percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ContentLayout>
  )
}
