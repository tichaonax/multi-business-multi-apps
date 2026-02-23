'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatCurrency } from '@/lib/format-currency'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange = 'today' | 'week' | 'month' | 'all'

interface AnalyticsSummary {
  totalSales: number
  totalRevenue: number
  averageOrderValue: number
  overallActivationRate: number
}

interface DailyRevenue {
  date: string
  sales: number
  revenue: number
}

interface PackagePerf {
  packageName: string
  totalSales: number
  totalRevenue: number
  activationRate: number
  averagePrice: number
}

interface TopMetrics {
  bestSellingPackage: string | null
  highestRevenuePackage: string | null
  bestActivationRate: string | null
  peakSalesDay: string | null
}

interface SaleRecord {
  id: string
  username: string
  password: string
  status: string
  salePrice: number | null
  soldAt: string | null
  activatedAt: string | null
  expiresAt: string | null
  tokenConfig: { name: string; durationMinutes: number } | null
  wlan: { ssid: string } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6']

const STATUS_COLORS: Record<string, string> = {
  SOLD:    '#3b82f6',
  ACTIVE:  '#10b981',
  EXPIRED: '#9ca3af',
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  week:  'Last 7 days',
  month: 'Last 30 days',
  all:   'All time',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function statusPill(status: string) {
  const cls: Record<string, string> = {
    SOLD:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    ACTIVE:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    EXPIRED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  }
  return cls[status] || 'bg-gray-100 text-gray-600'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-lg shadow p-5 ${color}`}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function InsightCard({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <span className="text-xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{value ?? '—'}</p>
      </div>
    </div>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────

function SalesHistoryContent() {
  const { currentBusinessId, activeBusinesses, isSystemAdmin } = useBusinessPermissionsContext()

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [packagePerf, setPackagePerf] = useState<PackagePerf[]>([])
  const [topMetrics, setTopMetrics] = useState<TopMetrics | null>(null)
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [r710BusinessIds, setR710BusinessIds] = useState<Set<string>>(new Set())

  // Filter out umbrella (non-real) businesses, then check R710 integration for each
  const nonUmbrellaBusinesses = activeBusinesses.filter(b => b.businessType !== 'umbrella')

  useEffect(() => {
    if (nonUmbrellaBusinesses.length === 0) return
    Promise.all(
      nonUmbrellaBusinesses.map(b =>
        fetch(`/api/r710/integration?businessId=${b.businessId}`)
          .then(r => r.json())
          .then(data => data.hasIntegration ? b.businessId : null)
          .catch(() => null)
      )
    ).then(results => {
      setR710BusinessIds(new Set(results.filter(Boolean) as string[]))
    })
  }, [activeBusinesses])

  // Businesses with R710 integration (used for dropdown)
  const r710Businesses = nonUmbrellaBusinesses.filter(b => r710BusinessIds.has(b.businessId))

  // Initialise to current business once it loads; user can override via dropdown
  useEffect(() => {
    if (!selectedBusinessId && currentBusinessId) setSelectedBusinessId(currentBusinessId)
  }, [currentBusinessId])

  const showBusinessSelector = r710Businesses.length > 1
  const selectedBusinessName = r710Businesses.find(b => b.businessId === selectedBusinessId)?.businessName
    ?? nonUmbrellaBusinesses.find(b => b.businessId === selectedBusinessId)?.businessName

  const load = async () => {
    if (!selectedBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const [analyticsRes, salesRes] = await Promise.all([
        fetch(`/api/r710/analytics?businessId=${selectedBusinessId}&dateRange=${dateRange}`),
        fetch(`/api/r710/sales?businessId=${selectedBusinessId}&dateRange=${dateRange}`),
      ])
      if (!analyticsRes.ok || !salesRes.ok) throw new Error('Failed to load data')
      const [analytics, salesData] = await Promise.all([analyticsRes.json(), salesRes.json()])

      setSummary(analytics.summary)
      // API returns descending — reverse to chronological for charts
      setDailyRevenue([...(analytics.dailyRevenue || [])].reverse())
      setPackagePerf(analytics.packagePerformance || [])
      setTopMetrics(analytics.topMetrics)
      setSales(salesData.sales || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [selectedBusinessId, dateRange])

  // Pie data: group sales by status
  const statusCounts = sales.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      {/* Back + filter row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/r710-portal"
            className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm"
          >
            ← Back to R710 Portal
          </Link>
          {/* Business selector — only shown when multiple R710-enabled businesses exist */}
          {showBusinessSelector && (
            <select
              value={selectedBusinessId ?? ''}
              onChange={e => setSelectedBusinessId(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-blue-500"
            >
              {r710Businesses.map(b => (
                <option key={b.businessId} value={b.businessId}>{b.businessName}</option>
              ))}
            </select>
          )}
          {/* Show current business name when no selector */}
          {!showBusinessSelector && selectedBusinessName && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedBusinessName}</span>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                dateRange === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {DATE_RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Loading...</p>
        </div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Sales"
              value={String(summary?.totalSales ?? 0)}
              sub={`${DATE_RANGE_LABELS[dateRange]}`}
              color="bg-white dark:bg-gray-800"
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrency(summary?.totalRevenue ?? 0)}
              sub={`Avg ${formatCurrency(summary?.averageOrderValue ?? 0)} / token`}
              color="bg-white dark:bg-gray-800"
            />
            <StatCard
              label="Activation Rate"
              value={`${(summary?.overallActivationRate ?? 0).toFixed(1)}%`}
              sub="Tokens actually used"
              color="bg-white dark:bg-gray-800"
            />
            <StatCard
              label="Packages Sold"
              value={String(packagePerf.length)}
              sub={packagePerf[0] ? `Top: ${packagePerf[0].packageName}` : 'No data'}
              color="bg-white dark:bg-gray-800"
            />
          </div>

          {/* ── Insights row ── */}
          {topMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InsightCard icon="🏆" label="Best Seller"         value={topMetrics.bestSellingPackage} />
              <InsightCard icon="💰" label="Top Revenue Package" value={topMetrics.highestRevenuePackage} />
              <InsightCard icon="⚡" label="Best Activation Rate" value={topMetrics.bestActivationRate} />
              <InsightCard icon="📅" label="Peak Sales Day"       value={topMetrics.peakSalesDay} />
            </div>
          )}

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue trend line chart */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Revenue Trend</h3>
              {dailyRevenue.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dailyRevenue} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      angle={-40}
                      textAnchor="end"
                      height={55}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                    />
                    <YAxis yAxisId="rev" orientation="left"  tickFormatter={v => `$${v}`}  tick={{ fontSize: 11, fill: '#9ca3af' }} width={55} />
                    <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} width={30} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                      formatter={(value: number, name: string) =>
                        name === 'Revenue' ? [formatCurrency(value), name] : [value, name]
                      }
                      labelFormatter={formatShortDate}
                    />
                    <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
                    <Line yAxisId="rev" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5}
                          dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} name="Revenue" />
                    <Line yAxisId="cnt" type="monotone" dataKey="sales"   stroke="#10b981" strokeWidth={2}
                          dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} name="Sales" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Status breakdown pie */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Token Status</h3>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Tokens']} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Package performance bar chart ── */}
          {packagePerf.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Package Performance</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={packagePerf} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="packageName" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis yAxisId="rev" orientation="left"  tickFormatter={v => `$${v}`}  tick={{ fontSize: 11, fill: '#9ca3af' }} width={55} />
                  <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} width={30} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, name: string) =>
                      name === 'Revenue' ? [formatCurrency(value), name] : [value, name]
                    }
                  />
                  <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="rev" dataKey="totalRevenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {packagePerf.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                  <Bar yAxisId="cnt" dataKey="totalSales"   name="Sales"   fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Transaction table ── */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Transactions</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">{sales.length} record{sales.length !== 1 ? 's' : ''}</span>
            </div>
            {sales.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No transactions for this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Token</th>
                      <th className="px-4 py-3 text-left">Package</th>
                      <th className="px-4 py-3 text-left">WLAN</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-left">Sold At</th>
                      <th className="px-4 py-3 text-left">Activated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sales.map(sale => (
                      <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-mono text-xs">
                          <div className="font-medium">{sale.username}</div>
                          <div className="text-gray-400">{sale.password}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{sale.tokenConfig?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{sale.wlan?.ssid ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusPill(sale.status)}`}>
                            {sale.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {sale.salePrice != null ? formatCurrency(sale.salePrice) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(sale.soldAt)}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(sale.activatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function R710SalesHistoryPage() {
  return (
    <ProtectedRoute>
      <ContentLayout title="R710 Sales History" subtitle="Token sales performance & analytics">
        <SalesHistoryContent />
      </ContentLayout>
    </ProtectedRoute>
  )
}
