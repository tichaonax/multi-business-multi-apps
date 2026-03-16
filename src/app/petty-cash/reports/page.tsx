'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED:  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  SETTLED:   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function PettyCashReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const { currentBusinessId, currentBusiness, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
  }, [session, status, router])

  const fetchReport = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId })
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (statusFilter) params.set('status', statusFilter)
      if (channelFilter) params.set('paymentChannel', channelFilter)
      const res = await fetch(`/api/petty-cash/reports?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setReportData(json.data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, dateFrom, dateTo, statusFilter, channelFilter, toast])

  useEffect(() => { fetchReport() }, [fetchReport])

  if (status === 'loading' || bizLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }

  const summary = reportData?.summary
  const requests = reportData?.requests || []
  const channelBreakdown = reportData?.channelBreakdown || {}
  const ecocashNet = channelBreakdown['ECOCASH']?.netSpend || 0

  return (
    <ContentLayout title="Petty Cash Reports">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Petty Cash Reports</h1>
            {currentBusiness && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentBusiness.businessName}</p>}
          </div>
          <Link href="/petty-cash" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Back to list</Link>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="SETTLED">Settled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Channel</label>
            <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">All</option>
              <option value="CASH">💵 Cash</option>
              <option value="ECOCASH">📱 EcoCash</option>
            </select>
          </div>
          <button onClick={fetchReport} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Apply</button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Approved', value: fmt(summary.totalApproved), color: 'text-blue-700 dark:text-blue-400' },
              { label: 'Net Spend', value: fmt(summary.netSpend), color: 'text-red-600 dark:text-red-400' },
              { label: 'Total Returned', value: fmt(summary.totalReturned), color: 'text-green-600 dark:text-green-400' },
              { label: 'Outstanding', value: summary.outstandingCount, color: summary.outstandingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400', suffix: ' requests' },
            ].map(card => (
              <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                  {card.value}{card.suffix || ''}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* EcoCash channel card (shown when EcoCash exists) */}
        {ecocashNet > 0 && (
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-xl p-4 flex items-center gap-4">
            <span className="text-2xl">📱</span>
            <div>
              <p className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">EcoCash Net Spend</p>
              <p className="text-xl font-bold text-teal-700 dark:text-teal-300">{fmt(ecocashNet)}</p>
            </div>
            <div className="ml-4">
              <p className="text-xs text-teal-600 dark:text-teal-400">{channelBreakdown['ECOCASH']?.count || 0} requests via EcoCash</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Use the Channel filter to view only EcoCash requests</p>
            </div>
          </div>
        )}

        {/* Outstanding alert */}
        {summary?.outstandingCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">{summary.outstandingCount} request{summary.outstandingCount > 1 ? 's' : ''} still outstanding</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">These requests have been approved but not yet settled. Follow up with the cashier.</p>
            </div>
          </div>
        )}

        {/* Requests table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500">No requests found for the selected filters.</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Request Detail ({reportData?.pagination?.total || requests.length} total)</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Purpose</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Requester</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Approved</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Net Spend</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Returned</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Channel</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {requests.map((r: any) => (
                  <tr key={r.id} onClick={() => router.push(`/petty-cash/${r.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">{r.purpose}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.requester?.name || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">{r.approvedAmount != null ? fmt(r.approvedAmount) : '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">{r.netSpend != null ? fmt(r.netSpend) : '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-600 dark:text-green-400">{r.returnAmount != null ? fmt(r.returnAmount) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.paymentChannel === 'ECOCASH' ? '📱' : '💵'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] || ''}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(r.requestedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
