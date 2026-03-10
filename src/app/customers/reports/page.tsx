'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useCallback } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import {
  Users, TrendingUp, DollarSign, ShoppingBag, Calendar, ChevronDown, ChevronUp,
  Download, AlertTriangle, Clock, CheckCircle
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentOrder {
  orderNumber: string
  date: string
  amount: number
  paymentMethod: string | null
  itemCount: number
}

interface CustomerRow {
  id: string
  customerNumber: string
  name: string
  phone: string | null
  orderCount: number
  totalSpend: number
  avgOrderValue: number
  lastVisit: string
  daysSinceLastVisit: number
  avgDaysBetweenVisits: number | null
  status: 'active' | 'at_risk' | 'lapsed'
  recentOrders: RecentOrder[]
}

interface Summary {
  totalCustomers: number
  trackedRevenue: number
  avgSpend: number
  topSpender: { name: string; amount: number } | null
  mostFrequent: { name: string; count: number } | null
  avgDaysBetweenVisits: number | null
}

type Period = '30d' | '90d' | '12m' | 'all'
type SortKey = 'spend' | 'orders' | 'recent' | 'avgOrder'
type Tab = 'overview' | 'rankings'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const statusConfig = {
  active:   { label: 'Active',   icon: CheckCircle,    cls: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20'  },
  at_risk:  { label: 'At Risk',  icon: Clock,          cls: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20'  },
  lapsed:   { label: 'Lapsed',   icon: AlertTriangle,  cls: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20'      },
}

function StatusBadge({ status }: { status: CustomerRow['status'] }) {
  const cfg = statusConfig[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
}

function SummaryCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
          <Icon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{value}</p>
          {sub && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(customers: CustomerRow[], businessName: string) {
  const headers = ['Rank', 'Customer', 'Customer #', 'Phone', 'Orders', 'Total Spend', 'Avg Order', 'Last Visit', 'Days Since Last', 'Status']
  const rows = customers.map((c, i) => [
    i + 1,
    c.name,
    c.customerNumber,
    c.phone ?? '',
    c.orderCount,
    c.totalSpend.toFixed(2),
    c.avgOrderValue.toFixed(2),
    new Date(c.lastVisit).toLocaleDateString(),
    c.daysSinceLastVisit,
    c.status,
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `customer-report-${businessName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CustomerReportsPage() {
  const { businesses, currentBusiness, currentBusinessId } = useBusinessPermissionsContext()

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
  const [period, setPeriod] = useState<Period>('30d')
  const [sort, setSort] = useState<SortKey>('spend')
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Init selected business from context
  useEffect(() => {
    if (currentBusinessId && !selectedBusinessId) setSelectedBusinessId(currentBusinessId)
  }, [currentBusinessId, selectedBusinessId])

  const fetchReport = useCallback(async () => {
    if (!selectedBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ period, sort, limit: '200' })
      if (selectedBusinessId && selectedBusinessId !== 'all') params.set('businessId', selectedBusinessId)
      const res = await fetch(`/api/customers/activity-report?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load report')
      setSummary(data.summary)
      setCustomers(data.customers)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [selectedBusinessId, period, sort])

  useEffect(() => { fetchReport() }, [fetchReport])

  const selectedBusiness = businesses?.find((b: any) => b.businessId === selectedBusinessId)
  const periodLabel = { '30d': 'Last 30 days', '90d': 'Last 90 days', '12m': 'Last 12 months', all: 'All time' }[period]

  return (
    <ContentLayout title="Customer Reports" description="Insights into customer behavior and spending patterns">
      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Business selector */}
        {businesses && businesses.length > 1 && (
          <select
            value={selectedBusinessId}
            onChange={e => setSelectedBusinessId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary"
          >
            {businesses.map((b: any, i: number) => (
              <option key={b.businessId ?? i} value={b.isUmbrellaBusiness ? 'all' : b.businessId}>
                {b.isUmbrellaBusiness ? 'All Businesses' : b.businessName}
              </option>
            ))}
          </select>
        )}

        {/* Period */}
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          {(['30d', '90d', '12m', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${period === p ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {p === 'all' ? 'All Time' : p === '12m' ? '12 Months' : p === '90d' ? '90 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(['overview', 'rankings'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${tab === t ? 'border-teal-600 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {t === 'overview' ? 'Overview' : 'Customer Rankings'}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-teal-600 border-t-transparent rounded-full" />
        </div>
      ) : !summary ? null : tab === 'overview' ? (
        /* ── Overview Tab ── */
        <div className="space-y-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selectedBusiness?.businessName ?? ''} · {periodLabel} · {summary.totalCustomers} customers with purchases
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <SummaryCard icon={Users}        label="Customers with Purchases" value={summary.totalCustomers.toString()} />
            <SummaryCard icon={DollarSign}   label="Revenue (Tracked)"        value={fmt(summary.trackedRevenue)} />
            <SummaryCard icon={TrendingUp}   label="Avg Spend per Customer"   value={fmt(summary.avgSpend)} />
            <SummaryCard
              icon={ShoppingBag}
              label="Top Spender"
              value={summary.topSpender?.name ?? '—'}
              sub={summary.topSpender ? fmt(summary.topSpender.amount) : undefined}
            />
            <SummaryCard
              icon={Calendar}
              label="Most Frequent Visitor"
              value={summary.mostFrequent?.name ?? '—'}
              sub={summary.mostFrequent ? `${summary.mostFrequent.count} visits` : undefined}
            />
            <SummaryCard
              icon={Clock}
              label="Avg Days Between Visits"
              value={summary.avgDaysBetweenVisits !== null ? `${summary.avgDaysBetweenVisits} days` : '—'}
            />
          </div>

          {/* Status breakdown */}
          {customers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Customer Status Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                {(['active', 'at_risk', 'lapsed'] as const).map(s => {
                  const count = customers.filter(c => c.status === s).length
                  const pct = Math.round((count / customers.length) * 100)
                  const cfg = statusConfig[s]
                  const Icon = cfg.icon
                  return (
                    <div key={s} className={`rounded-lg p-3 ${cfg.bg}`}>
                      <div className={`flex items-center gap-1.5 mb-1 ${cfg.cls}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-medium">{cfg.label}</span>
                      </div>
                      <div className={`text-2xl font-bold ${cfg.cls}`}>{count}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{pct}% of customers</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Rankings Tab ── */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Sort by:</span>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                {([['spend', 'Total Spend'], ['orders', 'Orders'], ['recent', 'Recent'], ['avgOrder', 'Avg Order']] as [SortKey, string][]).map(([k, lbl]) => (
                  <button
                    key={k}
                    onClick={() => setSort(k)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${sort === k ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            {/* Export */}
            {customers.length > 0 && (
              <button
                onClick={() => exportCSV(customers, selectedBusiness?.businessName ?? 'report')}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
          </div>

          {customers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
              No customer purchases found for this period.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Customer</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Orders</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Total Spend</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">Avg Order</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Last Visit</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-2 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <React.Fragment key={c.id}>
                      <tr
                        onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{c.customerNumber}{c.phone ? ` · ${c.phone}` : ''}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{c.orderCount}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{fmt(c.totalSpend)}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 hidden md:table-cell">{fmt(c.avgOrderValue)}</td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 text-xs hidden sm:table-cell">
                          {new Date(c.lastVisit).toLocaleDateString()}
                          <div className="text-gray-400 dark:text-gray-500">{c.daysSinceLastVisit}d ago</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-2 py-3 text-gray-400">
                          {expandedRow === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                      </tr>

                      {/* Expanded order history */}
                      {expandedRow === c.id && (
                        <tr key={`${c.id}-expanded`} className="bg-gray-50 dark:bg-gray-900/30">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Recent Orders</div>
                            {c.recentOrders.length === 0 ? (
                              <p className="text-xs text-gray-400">No orders found.</p>
                            ) : (
                              <div className="space-y-1">
                                {c.recentOrders.map(o => (
                                  <div key={o.orderNumber} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                                    <div>
                                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{o.orderNumber}</span>
                                      <span className="text-xs text-gray-400 ml-2">{new Date(o.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                      <span>{o.itemCount} item{o.itemCount !== 1 ? 's' : ''}</span>
                                      {o.paymentMethod && <span className="capitalize">{o.paymentMethod.toLowerCase()}</span>}
                                      <span className="font-semibold text-gray-900 dark:text-white">{fmt(o.amount)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {c.avgDaysBetweenVisits !== null && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                Avg {c.avgDaysBetweenVisits} days between visits
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </ContentLayout>
  )
}
