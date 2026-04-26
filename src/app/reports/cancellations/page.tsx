'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface CancellationRow {
  id: string
  orderId: string
  orderNumber: string
  createdAt: string
  paymentMethod: string
  grossAmount: number
  feeDeducted: number
  refundAmount: number
  staffReason: string
  customerName: string | null
  customerPhone: string | null
  customerNumber: string | null
  requestedBy: { id: string; name: string } | null
  approvedBy: { id: string; name: string } | null
  items: { name: string; quantity: number; unitPrice: number }[]
}

interface LogRow {
  id: string
  createdAt: string
  outcome: string
  orderNumber: string
  orderId: string
  grossAmount: number | null
  feeDeducted: number | null
  paymentMethod: string | null
  customerName: string | null
  customerNumber: string | null
  staffReason: string
  denialReason: string | null
  manager: { id: string; name: string } | null
  requestedBy: { id: string; name: string } | null
  items: { name: string; quantity: number; unitPrice: number }[]
}

interface Summary {
  totalCancellations: number
  totalNetRefund: number
  totalFeesDeducted: number
  cancellationRate: number
  denialRate: number
  totalOrdersInPeriod: number
}

const OUTCOME_STYLES: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  DENIED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ABORTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  FAILED_CODE: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

function ItemsTooltip({ items }: { items: { name: string; quantity: number }[] }) {
  const [open, setOpen] = useState(false)
  if (!items?.length) return <span className="text-gray-400">—</span>
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="text-blue-600 dark:text-blue-400 underline text-xs"
      >
        {items.length} item{items.length !== 1 ? 's' : ''}
      </button>
      {open && (
        <div className="absolute z-20 left-0 top-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[180px]">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-1 right-2 text-gray-400 hover:text-gray-600 text-sm"
          >✕</button>
          <ul className="space-y-1 mt-2">
            {items.map((item, i) => (
              <li key={i} className="text-xs text-gray-700 dark:text-gray-300">
                {item.quantity}× {item.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CancellationsTable({ rows, from, to }: { rows: CancellationRow[]; from: string; to: string }) {
  const exportCsv = () => {
    const headers = ['Date', 'Order #', 'Payment', 'Gross', 'Fee Deducted', 'Net Refund', 'Customer', 'Phone', 'Loyalty #', 'Staff Reason', 'Requested By', 'Approved By']
    const lines = rows.map(r => [
      new Date(r.createdAt).toLocaleString(),
      r.orderNumber,
      r.paymentMethod,
      r.grossAmount.toFixed(2),
      r.feeDeducted.toFixed(2),
      r.refundAmount.toFixed(2),
      r.customerName ?? 'Walk-in',
      r.customerPhone ?? '',
      r.customerNumber ?? '',
      `"${(r.staffReason || '').replace(/"/g, '""')}"`,
      r.requestedBy?.name ?? '',
      r.approvedBy?.name ?? '',
    ].join(','))
    downloadCsv([headers.join(','), ...lines].join('\n'), `cancellations-${from}-to-${to}.csv`)
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={exportCsv}
          disabled={!rows.length}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-10">No approved cancellations in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Order #</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2 text-right">Gross</th>
                <th className="px-3 py-2 text-right">Fee</th>
                <th className="px-3 py-2 text-right">Net Refund</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Requested By</th>
                <th className="px-3 py-2">Approved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.orderNumber}</td>
                  <td className="px-3 py-2 capitalize">{r.paymentMethod.toLowerCase()}</td>
                  <td className="px-3 py-2 text-right">${fmt(r.grossAmount)}</td>
                  <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                    {r.feeDeducted > 0 ? `-$${fmt(r.feeDeducted)}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-green-700 dark:text-green-400">${fmt(r.refundAmount)}</td>
                  <td className="px-3 py-2">
                    <div>{r.customerName ?? <span className="text-gray-400">Walk-in</span>}</div>
                    {r.customerNumber && <div className="text-xs text-gray-400">{r.customerNumber}</div>}
                    {r.customerPhone && <div className="text-xs text-gray-400">{r.customerPhone}</div>}
                  </td>
                  <td className="px-3 py-2"><ItemsTooltip items={r.items} /></td>
                  <td className="px-3 py-2 max-w-[160px]">
                    <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{r.staffReason}</span>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.requestedBy?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">{r.approvedBy?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function OverrideLogTable({ rows, from, to }: { rows: LogRow[]; from: string; to: string }) {
  const exportCsv = () => {
    const headers = ['Timestamp', 'Order #', 'Gross', 'Payment', 'Outcome', 'Manager', 'Staff', 'Staff Reason', 'Denial Reason', 'Customer']
    const lines = rows.map(r => [
      new Date(r.createdAt).toLocaleString(),
      r.orderNumber,
      r.grossAmount != null ? r.grossAmount.toFixed(2) : '',
      r.paymentMethod ?? '',
      r.outcome,
      r.manager?.name ?? '',
      r.requestedBy?.name ?? '',
      `"${(r.staffReason || '').replace(/"/g, '""')}"`,
      `"${(r.denialReason || '').replace(/"/g, '""')}"`,
      r.customerName ?? '',
    ].join(','))
    downloadCsv([headers.join(','), ...lines].join('\n'), `override-log-${from}-to-${to}.csv`)
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={exportCsv}
          disabled={!rows.length}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-10">No override log entries in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Order #</th>
                <th className="px-3 py-2 text-right">Gross</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Manager</th>
                <th className="px-3 py-2">Staff</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Customer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.orderNumber}</td>
                  <td className="px-3 py-2 text-right">{r.grossAmount != null ? `$${fmt(r.grossAmount)}` : '—'}</td>
                  <td className="px-3 py-2 capitalize">{r.paymentMethod?.toLowerCase() ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_STYLES[r.outcome] ?? ''}`}>
                      {r.outcome.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.manager?.name ?? <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-2 text-xs">{r.requestedBy?.name ?? '—'}</td>
                  <td className="px-3 py-2 max-w-[140px]">
                    <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{r.staffReason}</div>
                    {r.denialReason && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-0.5 line-clamp-2">Denied: {r.denialReason}</div>
                    )}
                  </td>
                  <td className="px-3 py-2"><ItemsTooltip items={r.items} /></td>
                  <td className="px-3 py-2 text-xs">{r.customerName ?? <span className="text-gray-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CancellationsPageContent() {
  const { currentBusinessId, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()

  const defaultTo = toInputDate(new Date())
  const defaultFrom = toInputDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [activeTab, setActiveTab] = useState<'cancellations' | 'log'>('cancellations')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [cancellations, setCancellations] = useState<CancellationRow[]>([])
  const [overrideLogs, setOverrideLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canView =
    isSystemAdmin ||
    hasPermission('canCloseBooks') ||
    hasPermission('canAccessFinancialData')

  const load = useCallback(async () => {
    if (!currentBusinessId || !canView) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/reports/cancellations?businessId=${currentBusinessId}&startDate=${from}&endDate=${to}`
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setSummary(json.summary)
      setCancellations(json.cancellations)
      setOverrideLogs(json.overrideLogs)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, from, to, canView])

  useEffect(() => {
    if (currentBusinessId) load()
  }, [currentBusinessId, load])

  if (!canView) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        You don't have permission to view this report.
      </div>
    )
  }

  return (
    <ContentLayout
      title="Cancellation Reports"
      breadcrumb={[
        { label: 'Reports', href: '/reports' },
        { label: 'Cancellations', isActive: true },
      ]}
    >
      {/* Date filters */}
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cancellations</div>
            <div className="text-2xl font-bold text-primary">{summary.totalCancellations}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Net Refund</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">${fmt(summary.totalNetRefund)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">EcoCash Fees Lost</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">${fmt(summary.totalFeesDeducted)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cancellation Rate</div>
            <div className="text-2xl font-bold text-primary">{summary.cancellationRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-400 mt-0.5">of orders in period</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Denial Rate</div>
            <div className="text-2xl font-bold text-primary">{summary.denialRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-400 mt-0.5">of manager decisions</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('cancellations')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'cancellations'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Approved Cancellations ({cancellations.length})
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'log'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Override Attempt Log ({overrideLogs.length})
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : activeTab === 'cancellations' ? (
            <CancellationsTable rows={cancellations} from={from} to={to} />
          ) : (
            <OverrideLogTable rows={overrideLogs} from={from} to={to} />
          )}
        </div>
      </div>
    </ContentLayout>
  )
}

export default function CancellationsReportPage() {
  return (
    <ProtectedRoute>
      <CancellationsPageContent />
    </ProtectedRoute>
  )
}
