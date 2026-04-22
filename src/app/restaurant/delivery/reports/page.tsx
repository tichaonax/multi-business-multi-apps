'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = 'sales' | 'credit' | 'blacklist' | 'runs'

type SalesReport = {
  type: 'sales'
  totalOrders: number
  totalRevenue: number
  totalCreditUsed: number
  totalCashToCollect: number
  orders: {
    id: string
    totalAmount: number
    createdAt: string
    meta?: { status: string; paymentMode: string; creditUsed: number; deliveryNote?: string | null }
  }[]
}

type CreditAccount = {
  id: string
  customerId: string
  balance: number
  isBlacklisted: boolean
  customer: { name: string; phone?: string; customerNumber: string }
  transactions: {
    id: string
    type: 'CREDIT' | 'DEBIT'
    amount: number
    notes?: string | null
    createdAt: string
  }[]
}

type CreditReport = {
  type: 'credit'
  accounts: CreditAccount[]
}

type BlacklistEntry = {
  id: string
  customerId: string
  blacklistReason?: string | null
  blacklistedAt?: string | null
  blacklistedBy?: string | null
  customer: { name: string; phone?: string; customerNumber: string }
}

type BlacklistReport = {
  type: 'blacklist'
  customers: BlacklistEntry[]
}

type RunReport = {
  type: 'runs'
  runs: {
    id: string
    runDate: string
    vehiclePlate?: string | null
    odometerStart?: number | null
    odometerEnd?: number | null
    distanceKm?: number | null
    dispatchedAt?: string | null
    completedAt?: string | null
    notes?: string | null
    driver?: { fullName?: string | null } | null
    orders: { orderId: string; status: string; paymentMode: string; creditUsed: number }[]
  }[]
}

type Report = SalesReport | CreditReport | BlacklistReport | RunReport

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMoney(n: number) {
  return `$${n.toFixed(2)}`
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    READY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    DISPATCHED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  }
  return map[s] || 'bg-gray-100 text-gray-500'
}

const today = () => new Date().toISOString().slice(0, 10)
const thirtyDaysAgo = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeliveryReportsPage() {
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const toast = useToastContext()
  const router = useRouter()

  const canViewReports = isSystemAdmin || hasPermission('canViewDeliveryReports')

  useEffect(() => {
    if (!canViewReports) router.replace('/restaurant/delivery')
  }, [canViewReports, router])

  const [activeTab, setActiveTab] = useState<ReportType>('sales')
  const [from, setFrom] = useState(thirtyDaysAgo())
  const [to, setTo] = useState(today())
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setReport(null)
    try {
      const params = new URLSearchParams({
        businessId: currentBusinessId,
        reportType: activeTab,
        from,
        to,
      })
      const res = await fetch(`/api/restaurant/delivery/reports?${params}`)
      const data = await res.json()
      if (!res.ok || !data.success) { toast.error(data.error || 'Failed to load report'); return }
      setReport(data.report)
    } catch {
      toast.error('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, activeTab, from, to, toast])

  useEffect(() => {
    if (currentBusinessId) loadReport()
  }, [loadReport, currentBusinessId])

  const tabs: { key: ReportType; label: string }[] = [
    { key: 'sales', label: 'Sales' },
    { key: 'credit', label: 'Customer Credit' },
    { key: 'blacklist', label: 'Blacklist' },
    { key: 'runs', label: 'Driver Runs' },
  ]

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout title="Delivery Reports">
        <div className="space-y-6">

          {/* Tab bar */}
          <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Date range filter (not used for blacklist) */}
          {activeTab !== 'blacklist' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <button
                onClick={loadReport}
                disabled={loading}
                className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Run Report'}
              </button>
            </div>
          )}

          {/* Content */}
          {loading && (
            <div className="text-center text-gray-400 py-16">Loading...</div>
          )}

          {!loading && report && (

            <>
              {/* ── Sales Report ── */}
              {report.type === 'sales' && (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Orders', value: String(report.totalOrders) },
                      { label: 'Total Revenue', value: fmtMoney(report.totalRevenue) },
                      { label: 'Credit Used', value: fmtMoney(report.totalCreditUsed) },
                      { label: 'Cash to Collect', value: fmtMoney(report.totalCashToCollect) },
                    ].map(c => (
                      <div key={c.label} className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">{c.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Orders table */}
                  {report.orders.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No delivery orders in this period.</p>
                  ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase">
                          <tr>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Payment</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3 text-right">Credit Used</th>
                            <th className="px-4 py-3 text-right">Cash Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {report.orders.map(o => {
                            const credit = Number(o.meta?.creditUsed || 0)
                            const total = Number(o.totalAmount)
                            return (
                              <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{fmtDate(o.createdAt)}</td>
                                <td className="px-4 py-2">
                                  {o.meta?.status && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(o.meta.status)}`}>
                                      {o.meta.status}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400 text-xs">{o.meta?.paymentMode || '—'}</td>
                                <td className="px-4 py-2 text-right text-gray-800 dark:text-gray-200">{fmtMoney(total)}</td>
                                <td className="px-4 py-2 text-right text-blue-600 dark:text-blue-400">{credit > 0 ? fmtMoney(credit) : '—'}</td>
                                <td className="px-4 py-2 text-right font-medium text-orange-600 dark:text-orange-400">
                                  {o.meta?.paymentMode === 'PREPAID' ? <span className="text-green-600 dark:text-green-400">Prepaid</span> : fmtMoney(total - credit)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Credit Report ── */}
              {report.type === 'credit' && (
                <div className="space-y-3">
                  {report.accounts.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No delivery credit accounts found.</p>
                  ) : (
                    report.accounts.map(acc => (
                      <div key={acc.id} className="bg-white dark:bg-gray-900 rounded-lg shadow">
                        <button
                          onClick={() => setExpandedAccount(expandedAccount === acc.id ? null : acc.id)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{acc.customer.name}</span>
                              {acc.customer.phone && <span className="ml-2 text-xs text-gray-500">{acc.customer.phone}</span>}
                              {acc.isBlacklisted && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Blacklisted</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Balance</p>
                              <p className={`font-bold ${acc.balance > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                                {fmtMoney(Number(acc.balance))}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Transactions</p>
                              <p className="font-medium text-gray-700 dark:text-gray-300">{acc.transactions.length}</p>
                            </div>
                            <span className="text-gray-400">{expandedAccount === acc.id ? '▲' : '▼'}</span>
                          </div>
                        </button>

                        {expandedAccount === acc.id && (
                          <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-3">
                            {acc.transactions.length === 0 ? (
                              <p className="text-sm text-gray-400 py-3 text-center">No transactions in this period.</p>
                            ) : (
                              <table className="w-full text-sm mt-2">
                                <thead className="text-xs text-gray-500 dark:text-gray-400">
                                  <tr>
                                    <th className="text-left py-1">Date</th>
                                    <th className="text-left py-1">Type</th>
                                    <th className="text-left py-1">Notes</th>
                                    <th className="text-right py-1">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                  {acc.transactions.map(tx => (
                                    <tr key={tx.id}>
                                      <td className="py-1.5 text-gray-600 dark:text-gray-400">{fmtDate(tx.createdAt)}</td>
                                      <td className="py-1.5">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.type === 'CREDIT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                          {tx.type}
                                        </span>
                                      </td>
                                      <td className="py-1.5 text-gray-500 text-xs">{tx.notes || '—'}</td>
                                      <td className={`py-1.5 text-right font-medium ${tx.type === 'CREDIT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {tx.type === 'CREDIT' ? '+' : '-'}{fmtMoney(Number(tx.amount))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Blacklist Report ── */}
              {report.type === 'blacklist' && (
                <div className="space-y-3">
                  {report.customers.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No blacklisted customers.</p>
                  ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase">
                          <tr>
                            <th className="px-4 py-3 text-left">Customer</th>
                            <th className="px-4 py-3 text-left">Phone</th>
                            <th className="px-4 py-3 text-left">Reason</th>
                            <th className="px-4 py-3 text-left">Banned By</th>
                            <th className="px-4 py-3 text-left">Date Banned</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {report.customers.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-4 py-2">
                                <p className="font-medium text-gray-800 dark:text-gray-200">{c.customer.name}</p>
                                <p className="text-xs text-gray-400">{c.customer.customerNumber}</p>
                              </td>
                              <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{c.customer.phone || '—'}</td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{c.blacklistReason || '—'}</td>
                              <td className="px-4 py-2 text-gray-500 text-xs">{c.blacklistedBy || '—'}</td>
                              <td className="px-4 py-2 text-gray-500 text-xs">{c.blacklistedAt ? fmtDate(c.blacklistedAt) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Driver Run Report ── */}
              {report.type === 'runs' && (
                <div className="space-y-3">
                  {report.runs.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No delivery runs in this period.</p>
                  ) : (
                    report.runs.map(run => {
                      const delivered = run.orders.filter(o => o.status === 'DELIVERED').length
                      const cashDue = run.orders.reduce((sum, o) => {
                        if (o.paymentMode === 'PREPAID') return sum
                        return sum // cash amounts not available here without order totals
                      }, 0)
                      const driverName = run.driver?.fullName || 'Unknown driver'
                      return (
                        <div key={run.id} className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-800 dark:text-gray-200">{driverName}</p>
                              <p className="text-sm text-gray-500">{fmtDate(run.runDate)}</p>
                              {run.vehiclePlate && <p className="text-xs text-gray-400 mt-0.5">Vehicle: {run.vehiclePlate}</p>}
                            </div>
                            <div className="flex flex-wrap gap-4 text-right">
                              <div>
                                <p className="text-xs text-gray-500">Orders</p>
                                <p className="font-bold text-gray-800 dark:text-gray-200">{run.orders.length}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Delivered</p>
                                <p className="font-bold text-green-600 dark:text-green-400">{delivered}</p>
                              </div>
                              {run.odometerStart != null && (
                                <div>
                                  <p className="text-xs text-gray-500">Odo Start</p>
                                  <p className="font-medium text-gray-700 dark:text-gray-300">{run.odometerStart} km</p>
                                </div>
                              )}
                              {run.odometerEnd != null && (
                                <div>
                                  <p className="text-xs text-gray-500">Odo End</p>
                                  <p className="font-medium text-gray-700 dark:text-gray-300">{run.odometerEnd} km</p>
                                </div>
                              )}
                              {run.distanceKm != null && (
                                <div>
                                  <p className="text-xs text-gray-500">Distance</p>
                                  <p className="font-bold text-blue-600 dark:text-blue-400">{run.distanceKm} km</p>
                                </div>
                              )}
                            </div>
                          </div>
                          {run.notes && (
                            <p className="mt-2 text-xs text-gray-500 italic">{run.notes}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${run.completedAt ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : run.dispatchedAt ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                              {run.completedAt ? 'Complete' : run.dispatchedAt ? 'Dispatched' : 'Created'}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
