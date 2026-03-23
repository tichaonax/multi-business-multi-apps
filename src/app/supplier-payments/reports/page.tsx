'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  BarChart,
} from 'recharts'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SummaryData {
  totalRequested: number
  totalPaid: number
  totalOutstanding: number
  overdueAmount: number
  avgDaysToPayment: number | null
  suppliersOwed: number
  statusCounts: Record<string, number>
  requestCount: number
}

interface BySupplierItem {
  supplierId: string
  supplierName: string
  supplierEmoji?: string | null
  totalRequested: number
  totalPaid: number
  totalOutstanding: number
  requestCount: number
  percentage?: number
}

interface TrendBucket {
  date: string
  requestCount: number
  requestedAmount: number
  paidAmount: number
}

interface OverdueItem {
  id: string
  supplier: { id: string; name: string; emoji?: string | null }
  submitter: { id: string; name: string }
  expenseAccount: { id: string; accountName: string }
  amount: number
  paidAmount: number
  remainingAmount: number
  dueDate: string
  daysOverdue: number
  status: string
}

interface TxRow {
  id: string
  supplier: { id: string; name: string; emoji?: string | null }
  submitter: { id: string; name: string }
  amount: number
  paidAmount: number
  remainingAmount: number
  dueDate: string
  submittedAt: string
  status: string
}

interface ExpenseAccount {
  id: string
  accountName: string
  balance: number
  isActive: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DONUT_COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#F97316','#06B6D4','#EC4899','#6B7280']
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B', APPROVED: '#3B82F6', DENIED: '#EF4444', PARTIAL: '#F97316', PAID: '#10B981',
}
const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Custom', value: 'custom' },
]
const TX_PER_PAGE = 20

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Translate preset → { startDate, endDate } strings for requests API */
function presetToDates(preset: string): { startDate: string; endDate: string } {
  const now = new Date()
  const toStr = (d: Date) => d.toISOString().slice(0, 10)
  const today = new Date(now); today.setHours(0, 0, 0, 0)

  if (preset === 'today') return { startDate: toStr(today), endDate: toStr(today) }
  if (preset === 'yesterday') {
    const y = new Date(today); y.setDate(y.getDate() - 1)
    return { startDate: toStr(y), endDate: toStr(y) }
  }
  if (preset === 'this_week') {
    const s = new Date(today); s.setDate(today.getDate() - today.getDay())
    return { startDate: toStr(s), endDate: toStr(now) }
  }
  if (preset === 'this_month') {
    return { startDate: toStr(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: toStr(now) }
  }
  if (preset === 'last_month') {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const e = new Date(now.getFullYear(), now.getMonth(), 0)
    return { startDate: toStr(s), endDate: toStr(e) }
  }
  return { startDate: '', endDate: '' }
}

function buildReportParams(businessId: string, datePreset: string, startDate: string, endDate: string, extra?: Record<string, string>) {
  const p = new URLSearchParams({ businessId })
  if (datePreset && datePreset !== 'custom') p.set('dateRange', datePreset)
  else if (datePreset === 'custom') {
    if (startDate) p.set('startDate', startDate)
    if (endDate) p.set('endDate', endDate)
  }
  if (extra) Object.entries(extra).forEach(([k, v]) => { if (v) p.set(k, v) })
  return p
}

function downloadCsv(rows: TxRow[]) {
  const header = 'Submitted,Supplier,Submitted By,Amount,Paid,Remaining,Due Date,Status'
  const lines = rows.map(r =>
    [fmtDate(r.submittedAt), r.supplier.name, r.submitter.name,
      r.amount.toFixed(2), r.paidAmount.toFixed(2), r.remainingAmount.toFixed(2),
      fmtDate(r.dueDate), r.status].join(',')
  )
  const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'supplier-payments.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SupplierPaymentReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const { currentBusinessId, loading: bizLoading, hasPermission, activeBusinesses } = useBusinessPermissionsContext()

  const canView = hasPermission('canViewSupplierPaymentReports')
  const canCross = hasPermission('canViewCrossBusinessReports')

  // Toolbar state (pending, before Apply)
  const [selectedBiz, setSelectedBiz] = useState('')
  const [datePreset, setDatePreset] = useState('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Data
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [bySupplier, setBySupplier] = useState<BySupplierItem[]>([])
  const [trends, setTrends] = useState<TrendBucket[]>([])
  const [overdue, setOverdue] = useState<OverdueItem[]>([])
  const [transactions, setTransactions] = useState<TxRow[]>([])
  const [accounts, setAccounts] = useState<ExpenseAccount[]>([])

  const [loading, setLoading] = useState(false)
  const [overdueExpanded, setOverdueExpanded] = useState(true)
  const [donutFilter, setDonutFilter] = useState<string | null>(null)
  const [txSort, setTxSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'submittedAt', dir: 'desc' })
  const [txPage, setTxPage] = useState(1)

  // Pay modal (for overdue panel)
  const [payTarget, setPayTarget] = useState<OverdueItem | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payAccountId, setPayAccountId] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (bizLoading || !currentBusinessId) return
    if (!canView) { router.push('/'); return }
    setSelectedBiz(currentBusinessId)
  }, [bizLoading, currentBusinessId, canView])

  useEffect(() => {
    if (!selectedBiz) return
    fetchAccounts()
    fetchAll()
  }, [selectedBiz])

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetchWithValidation(`/api/expense-account?businessId=${selectedBiz}`)
      setAccounts((res.data?.accounts || []).filter((a: ExpenseAccount) => a.isActive))
    } catch { /* non-blocking */ }
  }, [selectedBiz])

  const fetchAll = useCallback(async () => {
    if (!selectedBiz) return
    setLoading(true)
    try {
      const reportParams = buildReportParams(selectedBiz, datePreset, customStart, customEnd, statusFilter ? { status: statusFilter } : undefined)

      // Dates for transactions API
      let txStart = customStart, txEnd = customEnd
      if (datePreset && datePreset !== 'custom') {
        const d = presetToDates(datePreset); txStart = d.startDate; txEnd = d.endDate
      }
      const txParams = new URLSearchParams({ businessId: selectedBiz, limit: '500' })
      if (statusFilter) txParams.set('status', statusFilter)
      if (txStart) txParams.set('startDate', txStart)
      if (txEnd) txParams.set('endDate', txEnd)

      const [sumRes, bySupRes, trendRes, overdueRes, txRes] = await Promise.all([
        fetchWithValidation(`/api/supplier-payments/reports/summary?${reportParams}`),
        fetchWithValidation(`/api/supplier-payments/reports/by-supplier?${reportParams}`),
        fetchWithValidation(`/api/supplier-payments/reports/trends?${reportParams}`),
        fetchWithValidation(`/api/supplier-payments/reports/overdue?businessId=${selectedBiz}`),
        fetchWithValidation(`/api/supplier-payments/requests?${txParams}`),
      ])

      setSummary(sumRes.data)
      setBySupplier(bySupRes.data?.suppliers || [])
      setTrends(trendRes.data?.buckets || [])
      setOverdue(overdueRes.data?.requests || [])
      setTransactions(txRes.data || [])
      setDonutFilter(null)
      setTxPage(1)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [selectedBiz, datePreset, customStart, customEnd, statusFilter])

  // Transactions: filtered by donut click, then sorted, then paginated
  const sortedTx = useMemo(() => {
    let list = donutFilter
      ? transactions.filter(r => r.supplier.id === donutFilter)
      : transactions
    return [...list].sort((a, b) => {
      const { field, dir } = txSort
      let av: number | string = 0, bv: number | string = 0
      if (field === 'submittedAt') { av = a.submittedAt; bv = b.submittedAt }
      else if (field === 'amount') { av = a.amount; bv = b.amount }
      else if (field === 'dueDate') { av = a.dueDate; bv = b.dueDate }
      else if (field === 'status') { av = a.status; bv = b.status }
      if (av < bv) return dir === 'asc' ? -1 : 1
      if (av > bv) return dir === 'asc' ? 1 : -1
      return 0
    })
  }, [transactions, donutFilter, txSort])

  const txPageCount = Math.max(1, Math.ceil(sortedTx.length / TX_PER_PAGE))
  const txPageData = sortedTx.slice((txPage - 1) * TX_PER_PAGE, txPage * TX_PER_PAGE)

  const toggleSort = (field: string) => {
    setTxSort(prev => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' })
    setTxPage(1)
  }

  const SortIcon = ({ field }: { field: string }) => (
    <span className="ml-1 text-gray-400">
      {txSort.field === field ? (txSort.dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  // Status pie data from summary
  const statusPieData = useMemo(() => {
    if (!summary) return []
    return Object.entries(summary.statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ name: status, value: count, color: STATUS_COLORS[status] || '#6B7280' }))
  }, [summary])

  // Top 10 suppliers by outstanding balance
  const topSuppliers = useMemo(() =>
    [...bySupplier]
      .filter(s => s.supplierId !== '__others__')
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
      .slice(0, 10)
      .map(s => ({ name: s.supplierName, paid: s.totalPaid, outstanding: s.totalOutstanding }))
  , [bySupplier])

  // Pay modal
  const openPay = (item: OverdueItem) => {
    setPayTarget(item)
    setPayAmount(item.remainingAmount.toFixed(2))
    setPayAccountId(item.expenseAccount.id)
  }
  const submitPay = async () => {
    if (!payTarget) return
    const parsed = parseFloat(payAmount)
    if (isNaN(parsed) || parsed <= 0) { toast.error('Enter a valid amount'); return }
    setPaySubmitting(true)
    try {
      await fetchWithValidation(`/api/supplier-payments/requests/${payTarget.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsed, expenseAccountId: payAccountId || undefined }),
      })
      toast.push('Payment recorded')
      setPayTarget(null)
      fetchAll()
      fetchAccounts()
    } catch (err: any) {
      toast.error(err.message || 'Payment failed')
    } finally {
      setPaySubmitting(false)
    }
  }
  const payAccount = accounts.find(a => a.id === payAccountId) || null

  if (bizLoading) {
    return <ContentLayout title="Supplier Payment Reports"><div className="flex items-center justify-center py-20 text-gray-400">Loading...</div></ContentLayout>
  }

  return (
    <ContentLayout title="Supplier Payment Reports">
      <div className="space-y-5">

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Business selector */}
            {canCross && activeBusinesses.length > 1 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Business</label>
                <select value={selectedBiz} onChange={e => setSelectedBiz(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                  {activeBusinesses.map(b => <option key={b.businessId} value={b.businessId}>{b.businessName}</option>)}
                </select>
              </div>
            )}

            {/* Date presets */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date Range</label>
              <div className="flex gap-1 flex-wrap">
                {DATE_PRESETS.map(p => (
                  <button key={p.value} onClick={() => setDatePreset(p.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      datePreset === p.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="DENIED">Denied</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            <button onClick={fetchAll} disabled={loading}
              className="ml-auto px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'Loading...' : 'Apply'}
            </button>
          </div>

          {datePreset === 'custom' && (
            <div className="flex gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Requested', value: fmt(summary.totalRequested), color: 'blue' },
              { label: 'Total Paid', value: fmt(summary.totalPaid), color: 'green' },
              { label: 'Outstanding', value: fmt(summary.totalOutstanding), color: 'orange' },
              { label: 'Overdue', value: fmt(summary.overdueAmount), color: 'red' },
              { label: 'Avg Days to Pay', value: summary.avgDaysToPayment !== null ? `${summary.avgDaysToPayment}d` : '—', color: 'purple' },
              { label: 'Suppliers Owed', value: summary.suppliersOwed.toString(), color: 'gray' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4 text-center`}>
                <div className={`text-lg font-bold text-${color}-700 leading-tight`}>{value}</div>
                <div className={`text-xs text-${color}-600 mt-0.5`}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Charts Row: Donut + Status Pie ───────────────────────────── */}
        {(bySupplier.length > 0 || statusPieData.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Donut: by supplier */}
            {bySupplier.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Payment Distribution by Supplier</h3>
                {donutFilter && (
                  <button onClick={() => setDonutFilter(null)} className="text-xs text-blue-600 underline mb-2">Clear filter</button>
                )}
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={bySupplier}
                      dataKey="totalRequested"
                      nameKey="supplierName"
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      onClick={(entry: BySupplierItem) => {
                        if (entry.supplierId !== '__others__') setDonutFilter(entry.supplierId)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {bySupplier.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(v)} />
                    <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Status Pie */}
            {statusPieData.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Status Breakdown</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                      {statusPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${v} requests`} />
                    <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── Trends Chart ──────────────────────────────────────────────── */}
        {trends.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Payment Trends</h3>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={trends} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend formatter={(value: string) => <span className="text-xs capitalize">{value}</span>} />
                <Bar dataKey="requestedAmount" name="Requested" fill="#93C5FD" radius={[3,3,0,0]} />
                <Line dataKey="paidAmount" name="Paid" stroke="#10B981" strokeWidth={2} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Top Suppliers by Outstanding Balance ─────────────────────── */}
        {topSuppliers.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Top Suppliers by Outstanding Balance</h3>
            <ResponsiveContainer width="100%" height={Math.max(180, topSuppliers.length * 36)}>
              <BarChart data={topSuppliers} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend formatter={(value: string) => <span className="text-xs capitalize">{value}</span>} />
                <Bar dataKey="paid" name="Paid" stackId="a" fill="#10B981" />
                <Bar dataKey="outstanding" name="Outstanding" stackId="a" fill="#FCA5A5" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Overdue Panel ─────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
            onClick={() => setOverdueExpanded(e => !e)}
          >
            <span className="text-sm font-semibold text-gray-800">
              Overdue Requests
              {overdue.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">{overdue.length}</span>
              )}
            </span>
            <span className="text-gray-400">{overdueExpanded ? '▲' : '▼'}</span>
          </button>

          {overdueExpanded && (
            overdue.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-400 text-center">No overdue requests</div>
            ) : (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Supplier</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Submitted By</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Amount</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Remaining</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Due</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Days Over</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {overdue.map(r => (
                      <tr key={r.id} className="bg-red-50/40 hover:bg-red-50">
                        <td className="px-4 py-2 font-medium">
                          {r.supplier.emoji ? `${r.supplier.emoji} ` : ''}{r.supplier.name}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{r.submitter.name}</td>
                        <td className="px-4 py-2 text-right">{fmt(r.amount)}</td>
                        <td className="px-4 py-2 text-right text-orange-700 font-medium">{fmt(r.remainingAmount)}</td>
                        <td className="px-4 py-2 text-center text-xs text-gray-600">{fmtDate(r.dueDate)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">{r.daysOverdue}d</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {(r.status === 'APPROVED' || r.status === 'PARTIAL') && (
                            <button onClick={() => openPay(r)}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                              Pay Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* ── Transactions Table ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800">Transactions</h3>
              <span className="text-xs text-gray-400">{sortedTx.length} records{donutFilter ? ' (filtered by supplier)' : ''}</span>
            </div>
            <button onClick={() => downloadCsv(sortedTx)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              Export CSV
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm">No transactions found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th onClick={() => toggleSort('submittedAt')} className="text-left px-4 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                        Submitted <SortIcon field="submittedAt" />
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Supplier</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">By</th>
                      <th onClick={() => toggleSort('amount')} className="text-right px-4 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                        Amount <SortIcon field="amount" />
                      </th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Paid</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Remaining</th>
                      <th onClick={() => toggleSort('dueDate')} className="text-center px-4 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                        Due <SortIcon field="dueDate" />
                      </th>
                      <th onClick={() => toggleSort('status')} className="text-center px-4 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                        Status <SortIcon field="status" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {txPageData.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-500">{fmtDate(r.submittedAt)}</td>
                        <td className="px-4 py-2 font-medium">
                          {r.supplier.emoji ? `${r.supplier.emoji} ` : ''}{r.supplier.name}
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{r.submitter.name}</td>
                        <td className="px-4 py-2 text-right">{fmt(r.amount)}</td>
                        <td className="px-4 py-2 text-right text-green-700">{fmt(r.paidAmount)}</td>
                        <td className="px-4 py-2 text-right text-orange-700">{fmt(r.remainingAmount)}</td>
                        <td className="px-4 py-2 text-center text-xs text-gray-500">{fmtDate(r.dueDate)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: STATUS_COLORS[r.status] + '22', color: STATUS_COLORS[r.status] }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {txPageCount > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>Page {txPage} of {txPageCount}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                      ← Prev
                    </button>
                    <button onClick={() => setTxPage(p => Math.min(txPageCount, p + 1))} disabled={txPage === txPageCount}
                      className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Pay Modal (Overdue Panel) ─────────────────────────────────────── */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPayTarget(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Record Payment</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {payTarget.supplier.emoji ? `${payTarget.supplier.emoji} ` : ''}{payTarget.supplier.name} — {fmt(payTarget.remainingAmount)} remaining
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expense Account</label>
              <select value={payAccountId} onChange={e => setPayAccountId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {accounts.map(a => <option key={a.id} value={a.id}>{a.accountName} — {fmt(a.balance)}</option>)}
              </select>
              {payAccount && (
                <div className={`mt-1 text-xs ${payAccount.balance < parseFloat(payAmount || '0') ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                  Available: {fmt(payAccount.balance)}{payAccount.balance < parseFloat(payAmount || '0') ? ' — Insufficient' : ''}
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">$</span>
                <input type="number" step="0.10" min="0.01"
                  value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-7 pr-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={submitPay}
                disabled={paySubmitting || !payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > payTarget.remainingAmount}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {paySubmitting ? 'Processing...' : 'Confirm Payment'}
              </button>
              <button onClick={() => setPayTarget(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}
