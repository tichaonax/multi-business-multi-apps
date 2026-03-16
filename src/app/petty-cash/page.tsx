'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import { useNotifications } from '@/components/providers/notification-provider'
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
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PettyCashListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const { currentBusinessId, currentBusiness, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()
  const { refresh: refreshNotifications } = useNotifications()

  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, hasMore: false })
  const [canRequest, setCanRequest] = useState(false)
  const [canApprove, setCanApprove] = useState(false)
  const [permissionsLoaded, setPermissionsLoaded] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetch('/api/petty-cash/my-permissions', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.canRequest !== undefined) setCanRequest(j.canRequest)
        if (j.canApprove !== undefined) setCanApprove(j.canApprove)
        setPermissionsLoaded(true)
      })
      .catch(() => { setPermissionsLoaded(true) })
  }, [session, status, router])

  const fetchRequests = useCallback(async (page = 1) => {
    // Wait until we know the user's permissions before fetching
    if (!permissionsLoaded) return
    // Approvers see ALL requests (no business filter) — their job is to action any pending request
    // Requesters see only their current business's requests
    if (!currentBusinessId && !canApprove) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (currentBusinessId && !canApprove) params.set('businessId', currentBusinessId)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/petty-cash/requests?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRequests(json.data.requests)
      setPagination(json.data.pagination)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, canApprove, permissionsLoaded, statusFilter, toast])

  useEffect(() => { fetchRequests(1) }, [fetchRequests])

  // Catch-all: sync any pending requests that have no notification yet, then refresh the bell
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/petty-cash/requests/sync-notifications', { method: 'POST', credentials: 'include' })
      .then(() => refreshNotifications())
      .catch(() => {})
  }, [status, refreshNotifications])

  if (status === 'loading' || bizLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }
  if (!session || !isAuthenticated) return null

  return (
    <ContentLayout title="Petty Cash">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Petty Cash</h1>
            {currentBusiness && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentBusiness.businessName}</p>}
          </div>
          <div className="flex gap-2">
            <Link
              href="/petty-cash/reports"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Reports
            </Link>
            {canRequest && (
              <Link
                href="/petty-cash/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                + New Request
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['', 'PENDING', 'APPROVED', 'SETTLED', 'CANCELLED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-4xl mb-3">💵</p>
            <p className="text-gray-500 dark:text-gray-400">No petty cash requests found</p>
            {canRequest && (
              <Link href="/petty-cash/new" className="mt-4 inline-block text-blue-600 dark:text-blue-400 text-sm hover:underline">Submit your first request</Link>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Purpose</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Requester</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Requested</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Approved</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {requests.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/petty-cash/${r.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.priority === 'URGENT' && <span className="text-xs font-bold text-red-600 dark:text-red-400">🚨 URGENT</span>}
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{r.purpose}</span>
                        <span className="text-xs text-gray-400">{r.paymentChannel === 'ECOCASH' ? '📱' : '💵'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.requester?.name || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">{fmt(r.requestedAmount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">
                      {r.approvedAmount != null ? fmt(r.approvedAmount) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(r.requestedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            {(pagination.page > 1 || pagination.hasMore) && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{pagination.total} total</span>
                <div className="flex gap-2">
                  {pagination.page > 1 && (
                    <button onClick={() => fetchRequests(pagination.page - 1)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Prev</button>
                  )}
                  {pagination.hasMore && (
                    <button onClick={() => fetchRequests(pagination.page + 1)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Next</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
