'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getEffectivePermissions } from '@/lib/permission-utils'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type Group = 'INDIVIDUAL' | 'CONTRACTOR' | 'SUPPLIER'

interface GroupTotal {
  group: Group
  totalPaid: number
  paymentCount: number
  uniquePayees: number
}

interface PayeeRow {
  payeeId: string
  payeeName: string
  totalPaid: number
  paymentCount: number
  lastPayment: string
}

interface MonthRow {
  month: string
  label: string
  totalPaid: number
  paymentCount: number
}

interface CategoryRow {
  categoryId: string
  categoryName: string
  emoji: string
  totalPaid: number
  paymentCount: number
}

interface InsightsData {
  groupTotals: GroupTotal[]
  topPayees: PayeeRow[]
  monthlyTrend: MonthRow[]
  categoryBreakdown: CategoryRow[]
  allPayees: PayeeRow[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TABS: { label: string; value: Group; activeCard: string; activeTab: string; textColor: string }[] = [
  {
    label: 'Individuals', value: 'INDIVIDUAL',
    activeCard: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    activeTab:  'border-blue-500 text-blue-700 dark:text-blue-300',
    textColor:  'text-blue-700 dark:text-blue-300',
  },
  {
    label: 'Contractors', value: 'CONTRACTOR',
    activeCard: 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
    activeTab:  'border-amber-500 text-amber-700 dark:text-amber-300',
    textColor:  'text-amber-700 dark:text-amber-300',
  },
  {
    label: 'Suppliers', value: 'SUPPLIER',
    activeCard: 'border-green-400 bg-green-50 dark:bg-green-900/20',
    activeTab:  'border-green-500 text-green-700 dark:text-green-300',
    textColor:  'text-green-700 dark:text-green-300',
  },
]

const GROUP_COLORS: Record<Group, string> = {
  INDIVIDUAL: '#3b82f6',
  CONTRACTOR: '#f59e0b',
  SUPPLIER:   '#22c55e',
}

const CATEGORY_COLORS = ['#6366f1', '#ec4899', '#f97316', '#14b8a6', '#8b5cf6', '#ef4444', '#84cc16', '#06b6d4', '#f43f5e', '#a855f7']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fmtFull = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function payeeHistoryUrl(payeeId: string, group: Group) {
  const type = group === 'SUPPLIER' ? 'SUPPLIER' : group === 'CONTRACTOR' ? 'CONTRACTOR' : 'PERSON'
  return `/expense-accounts/reports/payee-history?payeeType=${type}&payeeId=${payeeId}`
}

function defaultDateRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 29)
  return { start, end }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayeeInsightsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [activeGroup, setActiveGroup] = useState<Group>('INDIVIDUAL')
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange())
  const [allTime, setAllTime] = useState(false)
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Auth + permission guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const permissions = getEffectivePermissions(session?.user)
    if (!permissions.canViewExpenseReports) {
      router.push('/expense-accounts')
      return
    }
    loadData()
  }, [status, session, activeGroup, dateRange, allTime])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ group: activeGroup })
      if (!allTime) {
        params.set('startDate', dateRange.start.toISOString().split('T')[0])
        params.set('endDate', dateRange.end.toISOString().split('T')[0])
      }
      const res = await fetch(`/api/expense-account/reports/payee-insights?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to load insights'); return }
      setData(json.data)
    } catch {
      setError('Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  const filteredPayees = useMemo(() => {
    if (!data) return []
    if (!search.trim()) return data.allPayees
    const q = search.toLowerCase()
    return data.allPayees.filter((p) => p.payeeName.toLowerCase().includes(q))
  }, [data, search])

  const activeTab = TABS.find((t) => t.value === activeGroup)!

  // Group comparison data for bar chart
  const comparisonData = useMemo(() => {
    if (!data) return []
    return data.groupTotals.map((g) => ({
      name: TABS.find((t) => t.value === g.group)?.label || g.group,
      Total: g.totalPaid,
      fill: GROUP_COLORS[g.group],
    }))
  }, [data])

  if (status === 'loading') return null

  return (
    <ContentLayout title="Payee Expense Insights">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">Payee Expense Insights</h1>
            <p className="text-sm text-secondary mt-0.5">Spending breakdown across individuals, contractors, and suppliers</p>
          </div>
          <Link href="/expense-accounts/reports" className="text-sm text-secondary hover:text-primary underline">
            ← Reports Hub
          </Link>
        </div>

        {/* Date filter */}
        <DateRangeSelector
          value={dateRange}
          onChange={(r) => { setDateRange(r); setAllTime(false) }}
          showAllTime
          allTime={allTime}
          onAllTimeChange={setAllTime}
        />

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Group summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TABS.map((tab) => {
            const gt = data?.groupTotals.find((g) => g.group === tab.value)
            const isActive = activeGroup === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => { setActiveGroup(tab.value); setSearch('') }}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  isActive ? tab.activeCard : 'border-border bg-card hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isActive ? tab.textColor : 'text-secondary'}`}>
                  {tab.label}
                </div>
                {loading || !gt ? (
                  <div className="animate-pulse space-y-1">
                    <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-primary">{fmt(gt.totalPaid)}</div>
                    <div className="text-xs text-secondary mt-0.5">
                      {gt.paymentCount} payment{gt.paymentCount !== 1 ? 's' : ''} · {gt.uniquePayees} payee{gt.uniquePayees !== 1 ? 's' : ''}
                    </div>
                  </>
                )}
              </button>
            )
          })}
        </div>

        {/* Group comparison bar chart */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-secondary mb-3">Spending by Group</h2>
          {loading ? (
            <div className="h-40 animate-pulse bg-gray-100 dark:bg-gray-800 rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={comparisonData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => [fmtFull(v), 'Total Paid']} />
                <Bar dataKey="Total" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setActiveGroup(tab.value); setSearch('') }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeGroup === tab.value ? tab.activeTab : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top payees bar chart */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-secondary mb-3">
              Top {activeTab.label} by Amount
            </h2>
            {loading ? (
              <div className="h-56 animate-pulse bg-gray-100 dark:bg-gray-800 rounded" />
            ) : !data?.topPayees.length ? (
              <div className="h-56 flex items-center justify-center text-secondary text-sm">No payments in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.topPayees.map((p) => ({ name: p.payeeName.split(' ').slice(0, 2).join(' '), amount: p.totalPaid, payeeId: p.payeeId }))}
                  layout="vertical"
                  barSize={16}
                  margin={{ left: 0, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v: number) => [fmtFull(v), 'Total Paid']} />
                  <Bar dataKey="amount" fill={GROUP_COLORS[activeGroup]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly trend line chart */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-secondary mb-3">Monthly Spending Trend</h2>
            {loading ? (
              <div className="h-56 animate-pulse bg-gray-100 dark:bg-gray-800 rounded" />
            ) : !data?.monthlyTrend.length ? (
              <div className="h-56 flex items-center justify-center text-secondary text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.monthlyTrend} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(v: number) => [fmtFull(v), 'Total Paid']} />
                  <Line type="monotone" dataKey="totalPaid" stroke={GROUP_COLORS[activeGroup]} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category breakdown chart */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-secondary mb-3">Spending by Category — {activeTab.label}</h2>
          {loading ? (
            <div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-800 rounded" />
          ) : !data?.categoryBreakdown.length ? (
            <div className="h-48 flex items-center justify-center text-secondary text-sm">No category data in this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={data.categoryBreakdown.map((c, i) => ({
                  name: `${c.emoji} ${c.categoryName}`,
                  amount: c.totalPaid,
                  fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                }))}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={48} />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v: number) => [fmtFull(v), 'Total Paid']} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {data.categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payee table with search */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-primary">{activeTab.label} — All Payees</h2>
              {!loading && data && (
                <p className="text-xs text-secondary mt-0.5">
                  {search ? `${filteredPayees.length} of ${data.allPayees.length}` : data.allPayees.length} payee{data.allPayees.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <input
              type="text"
              placeholder="Search payees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 px-3 py-1.5 text-sm border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse h-10 bg-gray-100 dark:bg-gray-800 rounded" />
              ))}
            </div>
          ) : filteredPayees.length === 0 ? (
            <div className="p-8 text-center text-secondary text-sm">
              {search ? (
                <>No payees match &quot;{search}&quot;. <button onClick={() => setSearch('')} className="underline text-primary">Clear search</button></>
              ) : (
                `No ${activeTab.label.toLowerCase()} payments found in this period.`
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-secondary">Payee</th>
                  <th className="text-right px-4 py-3 font-medium text-secondary">Total Paid</th>
                  <th className="text-right px-4 py-3 font-medium text-secondary">Payments</th>
                  <th className="text-right px-4 py-3 font-medium text-secondary hidden sm:table-cell">Last Payment</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPayees.map((p) => (
                  <tr key={p.payeeId} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary">{p.payeeName}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">{fmtFull(p.totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-secondary">{p.paymentCount}</td>
                    <td className="px-4 py-3 text-right text-secondary hidden sm:table-cell">
                      {p.lastPayment ? new Date(p.lastPayment).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={payeeHistoryUrl(p.payeeId, activeGroup)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View history →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </ContentLayout>
  )
}
